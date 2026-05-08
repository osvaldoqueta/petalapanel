import React from 'react';

export function Button({ className, variant, size, children, ...props }: any) {
  let baseClass = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petala-500 disabled:pointer-events-none disabled:opacity-50 ";
  
  if (variant === 'outline') {
    baseClass += "border border-surface-700 bg-transparent hover:bg-surface-800 text-surface-300 hover:text-white ";
  } else if (variant === 'ghost') {
    baseClass += "hover:bg-surface-800 text-surface-300 hover:text-white ";
  } else if (variant === 'secondary') {
    baseClass += "bg-surface-800 text-white hover:bg-surface-700 ";
  } else if (variant === 'destructive') {
    baseClass += "bg-red-500 text-white hover:bg-red-600 ";
  } else {
    baseClass += "bg-petala-500 text-white hover:bg-petala-600 ";
  }
  
  if (size === 'sm') {
    baseClass += "h-9 px-3 text-xs ";
  } else if (size === 'icon') {
    baseClass += "h-10 w-10 ";
  } else {
    baseClass += "h-10 px-4 py-2 text-sm ";
  }

  return <button className={`${baseClass} ${className || ''}`} {...props}>{children}</button>;
}
