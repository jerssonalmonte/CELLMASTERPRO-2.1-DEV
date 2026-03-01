import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Barcode } from 'lucide-react';
import { startSafeScanner } from '@/lib/safeScanner';

interface Props {
  onScan: (code: string) => void;
  placeholder?: string;
}

export function BarcodeScanner({ onScan, placeholder = 'Escanear código de barras...' }: Props) {
  const [showCamera, setShowCamera] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle USB/Bluetooth scanner input (they type fast and end with Enter)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onScan(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, onScan]);

  // Stable ref for onScan to avoid re-triggering useEffect
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  // Camera scanner
  useEffect(() => {
    if (!showCamera) return;
    const { cleanup } = startSafeScanner(
      'barcode-scanner-container',
      (code) => {
        onScanRef.current(code);
        setShowCamera(false);
      }
    );
    return cleanup;
  }, [showCamera]);

  const stopCamera = () => setShowCamera(false);

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-10"
            autoFocus
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowCamera(true)} title="Escanear con cámara">
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Escáner de Cámara
            </DialogTitle>
          </DialogHeader>
          <div id="barcode-scanner-container" className="w-full rounded-lg overflow-hidden" />
          <Button variant="outline" onClick={stopCamera}>
            <X className="h-4 w-4 mr-2" /> Cerrar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
