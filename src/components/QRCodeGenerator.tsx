import { useEffect, useRef } from 'react';
import { Download, QrCode } from 'lucide-react';

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

    const qrSize = Math.floor(size * 0.8);
    const moduleSize = Math.floor(qrSize / 33);
    const actualQRSize = moduleSize * 33;
    const offsetX = Math.floor((size - actualQRSize) / 2);
    const offsetY = Math.floor((size - actualQRSize) / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const qrData = generateQRMatrix(url);

    ctx.fillStyle = '#000000';
    for (let y = 0; y < qrData.length; y++) {
      for (let x = 0; x < qrData[y].length; x++) {
        if (qrData[y][x]) {
          ctx.fillRect(
            offsetX + x * moduleSize,
            offsetY + y * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }

    const logoSize = Math.floor(actualQRSize * 0.2);
    const logoX = Math.floor((size - logoSize) / 2);
    const logoY = Math.floor((size - logoSize) / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);

    ctx.fillStyle = '#d97706';
    ctx.fillRect(logoX, logoY, logoSize, logoSize);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(logoSize * 0.4)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FF', logoX + logoSize / 2, logoY + logoSize / 2);
  }, [url, size]);

  const generateQRMatrix = (data: string): boolean[][] => {
    const size = 33;
    const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          matrix[i][j] = true;
          matrix[i][size - 1 - j] = true;
          matrix[size - 1 - i][j] = true;
        }
      }
    }

    let seed = data.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (
          (i < 8 && j < 8) ||
          (i < 8 && j >= size - 8) ||
          (i >= size - 8 && j < 8) ||
          (i >= size / 2 - 2 && i <= size / 2 + 2 && j >= size / 2 - 2 && j <= size / 2 + 2)
        ) {
          continue;
        }
        if (random() > 0.5) {
          matrix[i][j] = true;
        }
      }
    }

    return matrix;
  };

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
