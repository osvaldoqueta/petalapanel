import React from 'react';

export function Checkbox({ checked, onCheckedChange, id }: any) {
  return (
    <input 
      type="checkbox"
      id={id}
      checked={checked}
      onChange={e => onCheckedChange(e.target.checked)}
      className="h-4 w-4 rounded border-surface-600 bg-surface-800 text-petala-500 focus:ring-petala-500 cursor-pointer"
    />
  );
}
