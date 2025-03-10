// lib/user-image.ts
import { createClient } from '@supabase/supabase-js';
import { prisma } from './db';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Define a proper type for the cache result
/**
 * Cache a user's profile image to avoid 429 errors from Google
 */
export async function cacheUserImage(userId: string, imageUrl: string): Promise<string> {
  try {
    // Check if we already have a cached version
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cachedImagePath: true }
    });
    
    if (user?.cachedImagePath) {
      return user.cachedImagePath;
    }
    
    // Only cache Google images to avoid unnecessary storage usage
    if (!imageUrl.includes('googleusercontent.com')) {
      return imageUrl;
    }
    
    // Fetch the image with retry logic
    const imageResponse = await fetchWithRetry(imageUrl);
    
    if (!imageResponse) {
      throw new Error('Failed to fetch image after multiple attempts');
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Generate a unique filename
    const filename = `user-${userId}-${Date.now()}.jpg`;
    const filePath = `user-images/${filename}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });
    
    if (uploadError) {
      console.error('Error uploading to Supabase:', uploadError);
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    
    // Get the public URL
    const { data } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);
    
    const publicUrl = data.publicUrl;
    
    // Update user with cached image path
    await prisma.user.update({
      where: { id: userId },
      data: { cachedImagePath: publicUrl }
    });
    
    return publicUrl;
  } catch (error) {
    console.error('Error caching user image:', error);
    // Return a default image if caching fails
    return '/images/default-profile.png';
  }
}

/**
 * Fetch with exponential backoff retry logic
 */
async function fetchWithRetry(
  url: string, 
  maxRetries = 3, 
  baseDelay = 1000
): Promise<Response | null> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, {
        headers: {
          // Add a random cache buster to avoid cached 429 responses
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Random': Math.random().toString(),
        }
      });
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 429) {
        // Rate limited, wait and retry
        const delay = baseDelay * Math.pow(2, retries);
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
      } else {
        // Other error, don't retry
        console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        return null;
      }
    } catch (error) {
      console.error('Fetch error:', error);
      retries++;
      
      if (retries >= maxRetries) {
        return null;
      }
      
      const delay = baseDelay * Math.pow(2, retries);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

/**
 * Clean up old cached images that are no longer in use
 */
export async function cleanupUnusedImages(): Promise<{removed: number, errors: number}> {
  try {
    // Get all cached image paths in use
    const users = await prisma.user.findMany({
      where: {
        cachedImagePath: {
          not: null
        }
      },
      select: {
        cachedImagePath: true
      }
    });
    
    const usedImagePaths = users
      .map(user => user.cachedImagePath)
      .filter(Boolean) as string[];
    
    // Extract the file paths from the URLs
    const usedFilePaths = usedImagePaths.map(url => {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        return pathParts[pathParts.length - 1];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // If URL parsing fails, just use the whole string
        const parts = url.split('/');
        return parts[parts.length - 1];
      }
    });
    
    // List all files in the storage bucket
    const { data: files, error } = await supabase.storage
      .from('profile-images')
      .list('user-images');
    
    if (error) {
      throw error;
    }
    
    if (!files) {
      return { removed: 0, errors: 0 };
    }
    
    // Find files that are not in use
    const unusedFiles = files.filter(file => 
      !usedFilePaths.includes(file.name)
    );
    
    // Delete unused files
    let removed = 0;
    let errors = 0;
    
    for (const file of unusedFiles) {
      // Skip files less than 24 hours old to avoid race conditions
      const fileCreationTime = new Date(file.created_at || Date.now()).getTime();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      if (fileCreationTime > oneDayAgo) {
        console.log(`Skipping recently created file: ${file.name}`);
        continue;
      }
      
      const { error: deleteError } = await supabase.storage
        .from('profile-images')
        .remove([`user-images/${file.name}`]);
      
      if (deleteError) {
        console.error(`Error deleting file ${file.name}:`, deleteError);
        errors++;
      } else {
        removed++;
      }
    }
    
    return { removed, errors };
  } catch (error) {
    console.error('Error cleaning up unused images:', error);
    return { removed: 0, errors: 1 };
  }
}