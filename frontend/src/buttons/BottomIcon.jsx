export function BottomIcon({ label, icon }){
  return (
    <button className='flex flex-col items-center gap-1 text-xs text-gray-600 p-2'>
      {icon}
      <div>{label}</div>
    </button>
  );
}

