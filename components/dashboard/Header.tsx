// components/dashboard/Header.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import FallbackAvatar from '@/components/FallbackAvatar';

export default function Header({ title }: { title: string }) {
  const { data: session } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!session?.user?.id) return;
      
      try {
        // If we already have a cached image path that's not from Google, use it directly
        if (session.user.cachedImagePath && 
            !session.user.cachedImagePath.includes('googleusercontent.com')) {
          setProfileImage(session.user.cachedImagePath);
          return;
        }
        
        // If user has an image but we need to fetch/check cached version
        if (session.user.image) {
          // For Google images, always try to use cached version
          if (session.user.image.includes('googleusercontent.com')) {
            const response = await fetch(`/api/user/image?userId=${session.user.id}`);
            const data = await response.json();
            
            if (data.imageUrl) {
              setProfileImage(data.imageUrl);
              return;
            }
          } else {
            // Non-Google image, use directly
            setProfileImage(session.user.image);
            return;
          }
        }
        
        // Fallback to default
        setProfileImage(null);
      } catch (error) {
        console.error('Error fetching profile image:', error);
        setProfileImage(null);
      }
    };
    
    fetchProfileImage();
  }, [session]);
  
  const handleImageError = () => {
    setImageError(true);
    setProfileImage(null);
  };
  
  const userName = session?.user?.name || session?.user?.email || 'User';
  
  return (
    <header className="bg-white shadow">
      <div className="flex items-center justify-between px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center">
          {profileImage && !imageError ? (
            <div className="relative w-8 h-8 overflow-hidden rounded-full bg-gray-100">
              {/* Use a regular img tag instead of Next.js Image */}
              <img
                src={profileImage}
                alt={userName}
                className="object-cover w-full h-full"
                onError={handleImageError}
              />
            </div>
          ) : (
            <FallbackAvatar name={userName} size={32} />
          )}
          <span className="ml-2 text-sm font-medium text-gray-700">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}