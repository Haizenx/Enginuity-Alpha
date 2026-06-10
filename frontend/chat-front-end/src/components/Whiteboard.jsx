import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Image as ImageIcon, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const Whiteboard = ({ targetUserId, onClose }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bgImage, setBgImage] = useState(null);

  const socket = useAuthStore((state) => state.socket);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set up canvas resolution and sizing
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    
    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";
    context.strokeStyle = "#ef4444"; // Red marker
    context.lineWidth = 3;
    contextRef.current = context;

    // Listen for remote draw events
    const handleRemoteDraw = ({ x0, y0, x1, y1 }) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (!contextRef.current) return;
      contextRef.current.beginPath();
      contextRef.current.moveTo(x0 * w, y0 * h);
      contextRef.current.lineTo(x1 * w, y1 * h);
      contextRef.current.stroke();
      contextRef.current.closePath();
    };

    const handleRemoteClear = () => {
      clearCanvasLocally();
    };

    const handleRemoteBg = (bgDataUrl) => {
      setBgImage(bgDataUrl);
    };

    if (socket) {
      socket.on("whiteboard:onDraw", handleRemoteDraw);
      socket.on("whiteboard:onClear", handleRemoteClear);
      socket.on("whiteboard:onBg", handleRemoteBg);
    }

    return () => {
      if (socket) {
        socket.off("whiteboard:onDraw", handleRemoteDraw);
        socket.off("whiteboard:onClear", handleRemoteClear);
        socket.off("whiteboard:onBg", handleRemoteBg);
      }
    };
  }, [socket]);

  // Keep track of previous coordinate for continuous drawing
  const currentCoord = useRef({ x: 0, y: 0 });

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    currentCoord.current = { x: offsetX, y: offsetY };
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    
    // Emit normalized coordinates (0 to 1) so it works on different screen sizes
    const canvas = canvasRef.current;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    if (socket) {
      socket.emit("whiteboard:draw", {
        targetId: targetUserId,
        x0: currentCoord.current.x / w,
        y0: currentCoord.current.y / h,
        x1: offsetX / w,
        y1: offsetY / h,
      });
    }

    currentCoord.current = { x: offsetX, y: offsetY };
  };

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvasLocally = () => {
    const canvas = canvasRef.current;
    if (contextRef.current && canvas) {
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const clearCanvas = () => {
    clearCanvasLocally();
    if (socket) {
      socket.emit("whiteboard:clear", { targetId: targetUserId });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setBgImage(dataUrl);
        if (socket) {
          socket.emit("whiteboard:bg", { targetId: targetUserId, bgDataUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-gray-900/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="h-14 bg-slate-100 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-700">Blueprint Collab</h3>
            <label className="cursor-pointer bg-white px-3 py-1.5 rounded-md shadow-sm border border-slate-200 text-sm font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              Upload Blueprint
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <button onClick={clearCanvas} className="bg-white px-3 py-1.5 rounded-md shadow-sm border border-slate-200 text-sm font-medium hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors">
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Drawing Area */}
        <div className="flex-1 relative w-full h-full bg-slate-50 overflow-hidden cursor-crosshair">
          {bgImage && (
            <img src={bgImage} alt="Whiteboard Background" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-90" />
          )}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const rect = e.target.getBoundingClientRect();
              startDrawing({ nativeEvent: { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top } });
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const rect = e.target.getBoundingClientRect();
              draw({ nativeEvent: { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top } });
            }}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
