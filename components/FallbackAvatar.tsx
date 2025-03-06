// components/FallbackAvatar.tsx
'use client';

interface FallbackAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export default function FallbackAvatar({ name, size = 32, className = '' }: FallbackAvatarProps) {
  // Get the first letter of the name or use 'U' as default
  const initial = name?.charAt(0)?.toUpperCase() || 'U';
  
  // Generate a consistent color based on the name
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-600', 'bg-green-600', 'bg-yellow-500', 
      'bg-red-600', 'bg-purple-600', 'bg-pink-600'
    ];
    
    // Simple hash function to get a consistent index
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to index in our color array
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };
  
  const colorClass = name ? getColorFromName(name) : 'bg-blue-600';
  
  return (
    <div 
      className={`flex items-center justify-center rounded-full text-white ${colorClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: `${Math.max(size / 2.5, 10)}px` }} className="font-medium">
        {initial}
      </span>
    </div>
  );
}