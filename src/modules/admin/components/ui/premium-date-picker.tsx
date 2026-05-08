import React from 'react';

export function PremiumDatePicker({ value, onChange, placeholder }: any) {
  return (
    <input 
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex h-10 w-full rounded-xl border border-surface-700 bg-surface-900/50 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:border-petala-500"
      placeholder={placeholder}
    />
  );
}
