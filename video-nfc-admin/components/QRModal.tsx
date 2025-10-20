'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import QRCode from 'qrcode';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoUrl: string;
}

export function QRModal({ isOpen, onClose, videoId, videoUrl }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current && videoUrl) {
      QRCode.toCanvas(canvasRef.current, videoUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) {
          console.error('QRコード生成エラー:', error);
        }
      });
    }
  }, [isOpen, videoUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">QRコード</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="text-center">
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <canvas ref={canvasRef} className="mx-auto" />
          </div>
          <p className="text-sm text-gray-500 mb-2">
            動画ID: {videoId}
          </p>
          <p className="text-xs text-gray-400 break-all">
            {videoUrl}
          </p>
        </div>
      </div>
    </div>
  );
}