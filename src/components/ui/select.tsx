import React from 'react';

export function Select({ children, value, onValueChange }: any) {
  return (
    <div className="relative">
      <select 
        value={value} 
        onChange={e => onValueChange(e.target.value)} 
        className="flex h-10 w-full items-center justify-between rounded-xl border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-petala-500 appearance-none"
      >
        {children}
      </select>
    </div>
  );
}

export function SelectTrigger({ className, children }: any) {
  return <>{children}</>;
}

export function SelectValue({ placeholder }: any) {
  return <option value="" disabled>{placeholder}</option>;
}

export function SelectContent({ children }: any) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: any) {
  return <option value={value} className="bg-surface-900 text-white">{children}</option>;
}
