// components/ProfileImage.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import ErrorBoundary from './ErrorBoundary';

interface ProfileImageProps {
  src: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
}

function ProfileImageInner({ src, alt, size = 32, className = '' }: ProfileImageProps) {
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('/images/default-profile.png');
  
  useEffect(() => {
    // Only update the image source if it's a valid string and not already errored
    if (src && !error) {
      // Check if the URL is valid
      try {
        // For absolute URLs, validate with URL constructor
        if (src.startsWith('http')) {
          new URL(src); // This will throw if invalid
          setImageSrc(src);
        } 
        // For relative URLs, just use them directly
        else {
          setImageSrc(src);
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        console.error('Invalid image URL:', src);
        setImageSrc('/images/default-profile.png');
      }
    } else {
      setImageSrc('/images/default-profile.png');
    }
  }, [src, error]);

  return (
    <div 
      className={`relative overflow-hidden rounded-full bg-gray-100 ${className}`} 
      style={{ width: size, height: size }}
    >
      {/* Use a local component state for src to avoid passing invalid URLs to Next.js Image */}
      <Image
        src={imageSrc}
        alt={alt}
        width={size}
        height={size}
        className="object-cover"
        onError={() => {
          setError(true);
          setImageSrc('/images/default-profile.png');
        }}
        unoptimized={imageSrc.startsWith('http')} // Disable optimization for external URLs
      />
    </div>
  );
}

export default function ProfileImage(props: ProfileImageProps) {
  return (
    <ErrorBoundary fallback={
      <div 
        className={`flex items-center justify-center bg-blue-600 rounded-full ${props.className}`}
        style={{ width: props.size, height: props.size }}
      >
        <span className="text-xs font-medium text-white">
          {props.alt.charAt(0) || 'U'}
        </span>
      </div>
    }>
      <ProfileImageInner {...props} />
    </ErrorBoundary>
  );
}