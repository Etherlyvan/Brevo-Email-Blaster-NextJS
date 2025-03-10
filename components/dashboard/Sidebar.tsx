// components/dashboard/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { 
  FiHome, 
  FiMail, 
  FiSettings, 
  FiUsers, 
  FiFileText, 
  FiBarChart2, 
  FiLogOut,
  FiClock,
  FiMenu,
  FiX
} from 'react-icons/fi';
import FallbackAvatar from '@/components/FallbackAvatar';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
      name: 'Scheduled',
      href: '/dashboard/campaigns/scheduled',
      icon: <FiClock className="w-5 h-5" />,
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
    <>
      {/* Desktop Sidebar - Fixed full height */}
      <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:bg-gray-800">
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
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="flex-shrink-0 w-6 h-6 mr-3">
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 mt-auto border-t border-gray-700">
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
      
      {/* Mobile Menu Button */}
      <div className="fixed top-0 left-0 z-40 p-4 md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-white bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
        >
          {isMobileMenuOpen ? (
            <FiX className="w-6 h-6" />
          ) : (
            <FiMenu className="w-6 h-6" />
          )}
        </button>
      </div>
      
      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          <div className="relative flex flex-col flex-1 w-full max-w-xs bg-gray-800">
            <div className="absolute top-0 right-0 pt-2 pr-2">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center w-10 h-10 ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <FiX className="w-6 h-6 text-white" />
              </button>
            </div>
            
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
                <p className="text-sm font-medium text-white truncate max-w-[180px]">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate max-w-[180px]">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <nav className="px-2 mt-5 space-y-1">
                {navigation.map((item) => {
                  const isActive = isActiveLink(item.href);
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center px-2 py-2 text-base font-medium rounded-md
                        ${
                          isActive
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="flex-shrink-0 w-6 h-6 mr-3">
                        {item.icon}
                      </span>
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              
              <div className="p-4 mt-6 border-t border-gray-700">
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center w-full px-2 py-2 text-base font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
                >
                  <FiLogOut className="flex-shrink-0 w-6 h-6 mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 w-14" aria-hidden="true">
            {/* Dummy element to force sidebar to shrink to fit close icon */}
          </div>
        </div>
      )}
    </>
  );
}