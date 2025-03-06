// app/api/user/image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cacheUserImage } from "@/lib/user-image";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Get userId from query params
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  // Ensure the user can only access their own image
  if (userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Get the user's image URL
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true, cachedImagePath: true }
    });
    
    if (!user?.image) {
      return NextResponse.json({ imageUrl: "/images/default-profile.png" });
    }
    
    // If we already have a cached version, return it
    if (user.cachedImagePath) {
      return NextResponse.json({ imageUrl: user.cachedImagePath });
    }
    
    // Cache the image
    const cachedImageUrl = await cacheUserImage(userId, user.image);
    
    return NextResponse.json({ imageUrl: cachedImageUrl });
  } catch (error) {
    console.error("Error handling user image:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to process image",
      imageUrl: "/images/default-profile.png" // Provide fallback
    });
  }
}