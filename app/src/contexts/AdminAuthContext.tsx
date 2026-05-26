import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

const ADMIN_KEY = 'vok_admin_auth';
const PIN = import.meta.env.VITE_ADMIN_PIN || '';

interface AdminAuthContextValue {
  isAdmin: boolean;
  requireAuth: () => Promise<boolean>;
  logout: () => void;
  showModal: boolean;
  setShowModal: (v: boolean) => void;
  verifyPin: (pin: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(ADMIN_KEY) === '1');
  const [showModal, setShowModal] = useState(false);
  const [resolveRef, setResolveRef] = useState<((val: boolean) => void) | null>(null);

  const requireAuth = useCallback((): Promise<boolean> => {
    if (localStorage.getItem(ADMIN_KEY) === '1') {
      setIsAdmin(true);
      return Promise.resolve(true);
    }
    setShowModal(true);
    return new Promise((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);

  const verifyPin = useCallback((pin: string): boolean => {
    if (pin === PIN) {
      localStorage.setItem(ADMIN_KEY, '1');
      setIsAdmin(true);
      setShowModal(false);
      resolveRef?.(true);
      return true;
    }
    return false;
  }, [resolveRef]);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_KEY);
    setIsAdmin(false);
  }, []);

  const handleClose = useCallback(() => {
    setShowModal(false);
    resolveRef?.(false);
  }, [resolveRef]);

  return (
    <AdminAuthContext.Provider value={{ isAdmin, requireAuth, logout, showModal, setShowModal, verifyPin }}>
      {children}
      <AdminAuthModal open={showModal} onVerify={verifyPin} onClose={handleClose} />
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}

/* ===== MODAL ===== */
import { Lock, X, Eye, EyeOff } from 'lucide-react';

function AdminAuthModal({
  open,
  onVerify,
  onClose,
}: {
  open: boolean;
  onVerify: (pin: string) => boolean;
  onClose: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    if (onVerify(pin)) {
      setPin('');
      setError('');
    } else {
      setError('Неверный пароль');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[#141b2d] border border-[#2a3454] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(245,158,11,0.15)] flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#f59e0b]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#e8ecf4]">Доступ ограничен</h3>
              <p className="text-xs text-[#8b95b5]">Введите пароль для редактирования</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#4a5578] hover:text-[#e8ecf4] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              placeholder="Пароль"
              className="w-full h-12 px-4 pr-12 bg-[#1e2740] border border-[#2a3454] rounded-xl text-[#e8ecf4] text-sm placeholder:text-[#4a5578] focus:border-[#f59e0b] outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5578] hover:text-[#8b95b5] transition-colors"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="text-sm text-[#ef4444] bg-[rgba(239,68,68,0.1)] px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!pin}
            className="w-full h-11 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 text-[#1a1a2e] font-medium rounded-xl transition-all"
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
