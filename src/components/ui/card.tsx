import React from 'react';

export function Card({ className, children, ...props }: any) {
  return <div className={`glass border border-surface-700 rounded-2xl ${className || ''}`} {...props}>{children}</div>;
}

export function CardContent({ className, children, ...props }: any) {
  return <div className={`p-4 ${className || ''}`} {...props}>{children}</div>;
}

export function CardHeader({ className, children, ...props }: any) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className || ''}`} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: any) {
  return <h3 className={`font-semibold leading-none tracking-tight text-white ${className || ''}`} {...props}>{children}</h3>;
}

export function CardDescription({ className, children, ...props }: any) {
  return <p className={`text-sm text-surface-400 ${className || ''}`} {...props}>{children}</p>;
}
