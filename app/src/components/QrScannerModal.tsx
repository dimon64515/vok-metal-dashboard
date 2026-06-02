import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, X, Camera, Flashlight, FlashlightOff } from 'lucide-react';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export function QrScannerModal({ open, onClose, onScan }: QrScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCamera, setActiveCamera] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [scanning, setScanning] = useState(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async (cameraId: string) => {
    if (!containerRef.current) return;
    setError('');

    try {
      const scanner = new Html5Qrcode('qr-reader-container');
      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {
          // QR not found — ignore continuous errors
        }
      );

      setScanning(true);

      // Try to get torch capability
      try {
        const capabilities = scanner.getRunningTrackCameraCapabilities();
        const torch = (capabilities as unknown as { torchFeature?: () => { value(): boolean } })?.torchFeature?.();
        if (!torch?.value()) {
          setTorchOn(false);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Scanner start error:', err);
      setError('Не удалось запустить камеру. Проверьте разрешения.');
      setScanning(false);
    }
  }, [onScan, onClose, stopScanner]);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    let mounted = true;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!mounted) return;
        const cams = devices.map((d) => ({ id: d.id, label: d.label || `Камера ${d.id.slice(0, 8)}` }));
        setCameras(cams);

        // Prefer back camera
        const backCam = cams.find((c) =>
          /back|rear|environment/i.test(c.label)
        );
        const selected = backCam?.id || cams[0]?.id || '';
        setActiveCamera(selected);

        if (selected) {
          startScanner(selected);
        } else {
          setError('Камеры не найдены');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Camera enumeration error:', err);
        setError('Не удалось получить доступ к камере. Убедитесь, что вы используете HTTPS или localhost.');
      });

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
      const torch = (capabilities as unknown as { torchFeature?: () => { apply(v: boolean): Promise<void> } })?.torchFeature?.();
      if (torch) {
        const next = !torchOn;
        await torch.apply(next);
        setTorchOn(next);
      }
    } catch {
      // ignore
    }
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const idx = cameras.findIndex((c) => c.id === activeCamera);
    const next = cameras[(idx + 1) % cameras.length];
    await stopScanner();
    setActiveCamera(next.id);
    await startScanner(next.id);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={async () => { await stopScanner(); onClose(); }} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#141b2d] border border-[#2a3454] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3454]">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-[#f59e0b]" />
            <h2 className="text-base font-semibold text-[#e8ecf4]">Сканировать QR</h2>
          </div>
          <button
            onClick={async () => { await stopScanner(); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8b95b5] hover:text-[#e8ecf4] hover:bg-[#1e2740] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
          {error ? (
            <div className="text-center space-y-3">
              <div className="text-[#ef4444] text-sm bg-[rgba(239,68,68,0.1)] px-4 py-3 rounded-xl">
                {error}
              </div>
              <p className="text-xs text-[#8b95b5]">
                Для работы камеры нужен доступ через HTTPS или localhost.<br />
                На iOS: Настройки → Safari → Камера → Разрешить.
              </p>
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-square max-w-[320px] rounded-xl overflow-hidden border-2 border-[#f59e0b]/40">
                <div id="qr-reader-container" ref={containerRef} className="w-full h-full" />
                {!scanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e1a]/80">
                    <div className="w-8 h-8 border-3 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <p className="text-xs text-[#8b95b5] text-center">
                Наведите камеру на QR-код упаковки
              </p>

              <div className="flex items-center gap-3">
                {cameras.length > 1 && (
                  <button
                    onClick={switchCamera}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1e2740] border border-[#2a3454] rounded-xl text-sm text-[#e8ecf4] hover:bg-[#2a3454] transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Переключить камеру
                  </button>
                )}
                <button
                  onClick={toggleTorch}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1e2740] border border-[#2a3454] rounded-xl text-sm text-[#e8ecf4] hover:bg-[#2a3454] transition-colors"
                >
                  {torchOn ? <FlashlightOff className="w-4 h-4" /> : <Flashlight className="w-4 h-4" />}
                  {torchOn ? 'Выключить' : 'Фонарик'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
