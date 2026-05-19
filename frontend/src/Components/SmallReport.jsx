import React from 'react';

export function SmallReport({ label, color, icon }) {
  const colorClasses = {
    sales: 'from-blue-500 to-blue-600',
    purchase: 'from-purple-500 to-purple-600',
    inventory: 'from-green-500 to-green-600',
    tax: 'from-orange-500 to-orange-600',
  };

  return (
    <button className={`bg-gradient-to-br ${colorClasses[color]} text-white rounded-xl  w-full p-4 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-2`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
