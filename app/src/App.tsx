import { useState } from 'react';
import type { PageType } from '@/types';
import { hasSupabaseConfig } from '@/lib/supabase';
import { useStorage } from '@/hooks/useStorage';
import { SidebarNav, BottomNav } from '@/sections/Navigation';
import { ExpensePage } from '@/sections/ExpensePage';
import { ReceiptPage } from '@/sections/ReceiptPage';
import { InventoryPage } from '@/sections/InventoryPage';
import { StatsPage } from '@/sections/StatsPage';
import { SettingsPage } from '@/sections/SettingsPage';
import { WorkTimePage } from '@/sections/WorkTimePage';

function App() {
  const [page, setPage] = useState<PageType>('expense');
  const [showSetup, setShowSetup] = useState(false);

  const storage = useStorage();

  // Must configure Supabase first
  if (!hasSupabaseConfig()) {
    return <SettingsPage onDone={() => window.location.reload()} />;
  }

  if (showSetup) {
    return (
      <SettingsPage
        onDone={() => setShowSetup(false)}
        expenses={storage.expenses}
        receipts={storage.receipts}
        adjustments={storage.adjustments}
        employees={storage.employees}
        attendance={storage.attendance}
      />
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'expense':
        return (
          <ExpensePage
            expenses={storage.expenses}
            onAdd={storage.addExpense}
            onDelete={storage.deleteExpense}
          />
        );
      case 'receipt':
        return (
          <ReceiptPage
            receipts={storage.receipts}
            onAdd={storage.addReceipt}
            onDelete={storage.deleteReceipt}
          />
        );
      case 'inventory':
        return (
          <InventoryPage
            adjustments={storage.adjustments}
            expenses={storage.expenses}
            receipts={storage.receipts}
            onAddAdjustment={storage.addAdjustment}
            onDeleteAdjustment={storage.deleteAdjustment}
          />
        );
      case 'stats':
        return (
          <StatsPage
            expenses={storage.expenses}
            getInventoryOnDate={storage.getInventoryOnDate}
          />
        );
      case 'worktime':
        return (
          <WorkTimePage
            employees={storage.employees}
            attendance={storage.attendance}
            onAddEmployee={storage.addEmployee}
            onEditEmployee={storage.editEmployee}
            onRemoveEmployee={storage.removeEmployee}
            onSetAttendance={storage.setAttendanceRecord}
            onClearAttendance={storage.clearAttendanceRecord}
            onLoadMonth={storage.loadAttendanceForMonth}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-[#e8ecf4] relative overflow-x-hidden">
      {/* Background decorative element */}
      <div
        className="fixed pointer-events-none z-0"
        style={{
          right: '-5%',
          top: '5%',
          width: '45vw',
          height: '90vh',
          opacity: 0.07,
          backgroundImage: 'url(/element.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right center',
          mixBlendMode: 'screen',
        }}
      />

      <SidebarNav active={page} onChange={setPage} onOpenSetup={() => setShowSetup(true)} />

      <main className="md:ml-[260px] min-h-screen relative z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-8">
          {/* Sync indicator */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span className="text-[11px] text-[#8b95b5] uppercase tracking-wider">Supabase</span>
            <button
              onClick={() => setShowSetup(true)}
              className="text-[11px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors ml-1"
            >
              Настройки
            </button>
          </div>

          {storage.loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-10 h-10 border-3 border-[#f59e0b] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm text-[#8b95b5]">Загрузка данных...</p>
            </div>
          ) : (
            renderPage()
          )}
        </div>
      </main>

      <BottomNav active={page} onChange={setPage} />
    </div>
  );
}

export default App;
