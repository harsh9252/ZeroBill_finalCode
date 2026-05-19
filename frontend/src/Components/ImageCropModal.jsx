import React, { useState, useRef } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { X, RotateCw, RotateCcw, ZoomIn, ZoomOut, RotateCcw as Reset } from 'lucide-react';

export default function ImageCropModal({ isOpen, imageUrl, onCrop, onClose }) {
  const cropperRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState(1);

  const handleCrop = () => {
    if (cropperRef.current) {
      const canvas = cropperRef.current.cropper.getCroppedCanvas();
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'logo.png', { type: 'image/png' });
          const croppedImage = canvas.toDataURL('image/png');
          onCrop(croppedImage, file);
          onClose();
        }
      }, 'image/png', 0.95);
    }
  };

  const handleRotate = (degree) => {
    if (cropperRef.current) {
      cropperRef.current.cropper.rotate(degree);
    }
  };

  const handleZoom = (value) => {
    const zoomValue = parseFloat(value);
    setZoom(zoomValue);
    if (cropperRef.current) {
      cropperRef.current.cropper.zoomTo(zoomValue);
    }
  };

  const handleReset = () => {
    if (cropperRef.current) {
      cropperRef.current.cropper.reset();
      setZoom(1);
    }
  };

  const handleAspectRatio = (ratio) => {
    if (cropperRef.current) {
      cropperRef.current.cropper.setAspectRatio(ratio);
      setAspectRatio(ratio);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-slate-100">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Image Cropper</h2>
            <p className="text-sm text-slate-500 mt-1">Adjust and crop your logo perfectly</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition duration-200 text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex gap-4 p-6" style={{ height: 'calc(90vh - 200px)' }}>
          {/* Cropper Area - Left Side */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
              {imageUrl && (
                <Cropper
                  ref={cropperRef}
                  src={imageUrl}
                  style={{ height: '100%', width: '100%' }}
                  initialAspectRatio={1}
                  guides={true}
                  cropBoxMovable={true}
                  cropBoxResizable={true}
                  toggleDragModeOnDblclick={true}
                  autoCropArea={0.8}
                  responsive={true}
                  restore={true}
                  background={true}
                  highlight={true}
                />
              )}
            </div>
          </div>

          {/* Controls - Right Side */}
          <div className="w-56 flex flex-col gap-2">
            {/* Zoom Section */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <ZoomIn size={14} className="text-white" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900">Zoom</h3>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <ZoomOut size={14} className="text-slate-600" />
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => handleZoom(e.target.value)}
                  className="flex-1 h-1.5 bg-blue-300 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <ZoomIn size={14} className="text-slate-600" />
              </div>
              <div className="text-center text-xs font-semibold text-blue-700 bg-white rounded-lg py-1">
                {zoom.toFixed(2)}x
              </div>
            </div>

            {/* Rotate Section */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-600 rounded-lg">
                  <RotateCw size={14} className="text-white" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900">Rotate</h3>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => handleRotate(-90)}
                  className="flex items-center justify-center gap-0.5 px-1.5 py-1 bg-white hover:bg-amber-50 border border-amber-300 rounded transition duration-200 text-xs font-semibold text-amber-700"
                >
                  <RotateCcw size={12} />
                  90°
                </button>
                <button
                  onClick={() => handleRotate(90)}
                  className="flex items-center justify-center gap-0.5 px-1.5 py-1 bg-white hover:bg-amber-50 border border-amber-300 rounded transition duration-200 text-xs font-semibold text-amber-700"
                >
                  <RotateCw size={12} />
                  90°
                </button>
              </div>
            </div>

            {/* Aspect Ratio Section */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-600 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" />
                  </svg>
                </div>
                <h3 className="text-xs font-semibold text-slate-900">Aspect</h3>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: '1:1', value: 1 },
                  { label: '3:4', value: 3 / 4 },
                  { label: '4:3', value: 4 / 3 },
                  { label: 'Free', value: NaN }
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => handleAspectRatio(option.value)}
                    className={`px-1.5 py-1 rounded text-xs font-semibold transition duration-200 ${
                      aspectRatio === option.value
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-lg transition duration-200 font-semibold text-xs shadow-md"
            >
              <Reset size={14} />
              Reset
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-slate-50 to-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition duration-200 font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="px-5 py-2 text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition duration-200 font-semibold text-sm shadow-lg hover:shadow-xl"
          >
            Crop & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
