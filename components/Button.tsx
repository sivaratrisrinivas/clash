import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  // Jony Ive / Fukasawa principles:
  // 1. Tactile: Scale down slightly on press.
  // 2. Simple: No heavy shadows, no gradients.
  // 3. Essential: Black and White (or Gray).
  
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed active:scale-95";
  
  const variants = {
    primary: "bg-[#111] text-white hover:bg-black dark:bg-[#EEE] dark:text-black dark:hover:bg-white rounded-full",
    secondary: "bg-[#F0F0F0] text-[#111] hover:bg-[#E5E5E5] dark:bg-[#222] dark:text-[#EEE] dark:hover:bg-[#333] rounded-full",
    ghost: "bg-transparent text-[#666] hover:text-[#111] hover:bg-[#F5F5F5] dark:text-[#888] dark:hover:text-[#EEE] dark:hover:bg-[#222] rounded-lg"
  };

  const sizes = {
    sm: "text-sm px-4 py-2",
    md: "text-[15px] px-6 py-3",
    lg: "text-lg px-8 py-4"
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};