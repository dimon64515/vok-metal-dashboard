import type { PageType } from '@/types';
import {
  PlusCircle,
  ArrowDownCircle,
  Package,
  BarChart3,
  Settings,
  Clock,
} from 'lucide-react';

const NAV_ITEMS: { key: PageType; label: string; icon: typeof PlusCircle }[] = [
  { key: 'expense', label: 'Расход', icon: PlusCircle },
  { key: 'receipt', label: 'Приход', icon: ArrowDownCircle },
  { key: 'inventory', label: 'Остатки', icon: Package },
  { key: 'stats', label: 'Статистика', icon: BarChart3 },
  { key: 'worktime', label: 'Время', icon: Clock },
];

interface NavigationProps {
  active: PageType;
  onChange: (page: PageType) => void;
  onOpenSetup?: () => void;
}

export function SidebarNav({ active, onChange, onOpenSetup }: NavigationProps) {
  return (
    <aside className="hidden md:flex flex-col w-[260px] fixed left-0 top-0 h-screen bg-[#141b2d] border-r border-[#2a3454] z-40">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2a3454]">
        <img src="/logo.png" alt="WOC" className="h-9 w-auto object-contain" />
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 ${
                isActive
                  ? 'bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border-l-[3px] border-l-[#f59e0b]'
                  : 'text-[#8b95b5] hover:bg-[#1e2740] hover:text-[#e8ecf4]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#2a3454] space-y-2">
        {onOpenSetup && (
          <button
            onClick={onOpenSetup}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-[#8b95b5] hover:bg-[#1e2740] hover:text-[#e8ecf4] transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Настройки
          </button>
        )}
        <p className="text-xs text-[#4a5578] px-3">ООО «ВОК-Регион»</p>
      </div>
    </aside>
  );
}

export function BottomNav({ active, onChange }: NavigationProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#141b2d]/95 backdrop-blur-md border-t border-[#2a3454] z-50 flex items-center justify-around pb-safe">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className="flex flex-col items-center gap-1 py-2 px-4 transition-colors duration-150"
          >
            <Icon
              className={`w-5 h-5 transition-colors ${
                isActive ? 'text-[#f59e0b]' : 'text-[#4a5578]'
              }`}
            />
            <span
              className={`text-[11px] font-medium transition-colors ${
                isActive ? 'text-[#f59e0b]' : 'text-[#4a5578]'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
