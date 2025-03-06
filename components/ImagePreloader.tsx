// components/ImagePreloader.tsx
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ImagePreloader() {
  const { data: session } = useSession();
  
  useEffect(() => {
    const preloadProfileImage = async () => {
      if (!session?.user?.id) return;
      
      try {
        // Preload the user's image when the app loads
        await fetch(`/api/user/image?userId=${session.user.id}`);
      } catch (error) {
        console.error('Error preloading image:', error);
      }
    };
    
    preloadProfileImage();
  }, [session]);
  
  return null; // This component doesn't render anything
}