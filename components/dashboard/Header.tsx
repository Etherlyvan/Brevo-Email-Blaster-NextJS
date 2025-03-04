// components/dashboard/Header.tsx
'use client';

import { useSession } from 'next-auth/react';

export default function Header({ title }: { title: string }) {
  const { data: session } = useSession();
  
  return (
    <header className="bg-white shadow">
      <div className="flex items-center justify-between px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || ''}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
              <span className="text-xs font-medium text-white">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
              </span>
            </div>
          )}
          <span className="ml-2 text-sm font-medium text-gray-700">
            {session?.user?.name || session?.user?.email}
          </span>
        </div>
      </div>
    </header>
  );
}