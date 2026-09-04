import { FolderKanban } from 'lucide-react';

export default function LogoMark({ size = 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center rounded-xl bg-indigo-700 shadow-sm shadow-indigo-700/20`}
    >
      <FolderKanban className={`${icon} text-white`} aria-hidden="true" />
    </div>
  );
}
