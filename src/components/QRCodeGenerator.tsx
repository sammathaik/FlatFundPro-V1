import { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  url: string;
  size?: number;
  showDownload?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function QRCodeGenerator({
  url,
  size = 256,
  showDownload = false,
  title = 'Scan for Demo',
  subtitle = 'Request a demo instantly',
  className = ''
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    }, (error) => {
      if (error) {
        console.error('QR Code generation error:', error);
      }
    });
  }, [url, size]);

  const downloadQRCode = () => {
    if (!canvasRef.current) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const padding = 80;
    const textHeight = 120;
    tempCanvas.width = size + padding * 2;
    tempCanvas.height = size + padding * 2 + textHeight;

    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.drawImage(canvasRef.current, padding, padding);

    tempCtx.fillStyle = '#111827';
    tempCtx.font = 'bold 32px Arial';
    tempCtx.textAlign = 'center';
    tempCtx.fillText(title, tempCanvas.width / 2, size + padding + 50);

    tempCtx.fillStyle = '#6b7280';
    tempCtx.font = '24px Arial';
    tempCtx.fillText(subtitle, tempCanvas.width / 2, size + padding + 90);

    const link = document.createElement('a');
    link.download = 'flatfund-pro-demo-qr.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div ref={containerRef} className={`flex flex-col items-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="border-4 border-gray-200 rounded-xl shadow-lg bg-white"
      />
      {showDownload && (
        <button
          onClick={downloadQRCode}
          className="mt-4 flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-md"
        >
          <Download className="w-5 h-5" />
          Download QR Code
        </button>
      )}
    </div>
  );
}
