'use client';

import React, { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
}

export default function IconButton({
  icon: Icon,
  label,
  variant = 'primary',
  size = 'medium',
  children,
  className = '',
  ...props
}: IconButtonProps) {
  const variantClasses = {
    primary: 'bg-hoockers-green text-white hover:bg-opacity-90',
    secondary: 'bg-light-gray text-black hover:bg-spanish-gray',
    outline: 'bg-transparent border-2 border-hoockers-green text-hoockers-green hover:bg-hoockers-green hover:text-white',
    ghost: 'bg-transparent text-gray-web hover:text-hoockers-green hover:bg-cultured-1'
  };

  const sizeClasses = {
    small: 'p-2 text-8',
    medium: 'p-3 text-7',
    large: 'p-4 text-6'
  };

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-6 font-urbanist font-500 
        transition-all duration-1 ease-cubic-out focus:outline-none focus:ring-2 
        focus:ring-hoockers-green focus:ring-offset-2 shadow-md
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}
      `}
      aria-label={label}
      {...props}
    >
      <Icon className={iconSizes[size]} />
      {children && <span className="ml-2">{children}</span>}
    </button>
  );
}
