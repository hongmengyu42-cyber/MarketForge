import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '@/store';

interface ThemeToggleProps {
  className?: string;
  showDropdown?: boolean;
}

export default function ThemeToggle({ className = '', showDropdown = true }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ];

  if (!showDropdown) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Theme: ${theme} (Click to toggle)`}
        className={`p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer ${className}`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun size={19} className="text-amber-400 animate-in spin-in-180 duration-300" />
        ) : (
          <Moon size={19} className="text-slate-700 animate-in spin-in-180 duration-300" />
        )}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Color theme menu"
        aria-expanded={isOpen}
        title={`Current theme: ${theme} (${resolvedTheme})`}
        className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer flex items-center justify-center relative"
      >
        {resolvedTheme === 'dark' ? (
          <Sun size={19} className="text-amber-400 transition-transform hover:rotate-45" />
        ) : (
          <Moon size={19} className="text-slate-700 transition-transform hover:-rotate-12" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
            Theme
          </div>
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className={isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-slate-500'} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={14} className="text-primary-600 dark:text-primary-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
