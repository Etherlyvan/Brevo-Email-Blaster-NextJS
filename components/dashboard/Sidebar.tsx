// components/dashboard/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import FallbackAvatar from '@/components/FallbackAvatar';
import { 
  FiHome, 
  FiMail, 
  FiSettings, 
  FiUsers, 
  FiFileText, 
  FiBarChart2, 
  FiLogOut 
} from 'react-icons/fi';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const pathname = usePathname();
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
  
  // Function to determine if a link is active
  const isActiveLink = (href: string): boolean => {
    // If path is exactly the same as href, then active
    if (pathname === href) return true;
    
    // For dashboard, only active if path is exactly '/dashboard'
    if (href === '/dashboard') return pathname === '/dashboard';
    
    // For other pages, check if path starts with href followed by / or nothing else
    return pathname.startsWith(`${href}/`) || pathname === href;
  };
  
  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <FiHome className="w-5 h-5" />,
    },
    {
      name: 'SMTP Settings',
      href: '/dashboard/smtp',
      icon: <FiSettings className="w-5 h-5" />,
    },
    {
      name: 'Email Templates',
      href: '/dashboard/templates',
      icon: <FiFileText className="w-5 h-5" />,
    },
    {
      name: 'Campaigns',
      href: '/dashboard/campaigns',
      icon: <FiMail className="w-5 h-5" />,
    },
    {
      name: 'Contacts',
      href: '/dashboard/contacts',
      icon: <FiUsers className="w-5 h-5" />,
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: <FiBarChart2 className="w-5 h-5" />,
    },
  ];
  
  const userName = session?.user?.name || session?.user?.email || 'User';
  
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-800">
      <div className="flex items-center flex-shrink-0 h-16 px-4 bg-gray-900">
        <h1 className="text-xl font-bold text-white">Brevo Email App</h1>
      </div>
      
      {/* User profile section */}
      <div className="flex items-center px-4 py-4 border-b border-gray-700">
        {profileImage && !imageError ? (
          <div className="relative w-10 h-10 overflow-hidden rounded-full bg-gray-100">
            <img
              src={profileImage}
              alt={userName}
              className="object-cover w-full h-full"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <FallbackAvatar 
            name={userName} 
            size={40} 
          />
        )}
        <div className="ml-3">
          <p className="text-sm font-medium text-white truncate max-w-[150px]">
            {session?.user?.name || 'User'}
          </p>
          <p className="text-xs text-gray-400 truncate max-w-[150px]">
            {session?.user?.email}
          </p>
        </div>
      </div>
      
      <div className="flex flex-col flex-1 overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = isActiveLink(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-2 py-2 text-sm font-medium rounded-md
                  ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <span className="flex-shrink-0 w-6 h-6 mr-3">
                  {item.icon}
                </span>
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
          >
            <FiLogOut className="flex-shrink-0 w-6 h-6 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}