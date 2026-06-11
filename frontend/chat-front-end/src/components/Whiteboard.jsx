import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Image as ImageIcon, X, FileText } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { pdfjs, Document, Page } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Whiteboard = ({ isCaller, targetUserId, onClose }) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const scrollContainerRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [bgImage, setBgImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);

  const socket = useAuthStore((state) => state.socket);
  const myColor = isCaller ? "#ef4444" : "#3b82f6"; // Red for Caller, Blue for Receiver

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set up canvas resolution and sizing
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    
    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";
    context.lineWidth = 3;
    context.strokeStyle = myColor;
    contextRef.current = context;

    // Listen for remote draw events
    const handleRemoteDraw = ({ x0, y0, x1, y1, color }) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (!contextRef.current) return;
      contextRef.current.strokeStyle = color;
      contextRef.current.beginPath();
      contextRef.current.moveTo(x0 * w, y0 * h);
      contextRef.current.lineTo(x1 * w, y1 * h);
      contextRef.current.stroke();
      contextRef.current.closePath();
      contextRef.current.strokeStyle = myColor; // reset
    };

    const handleRemoteClear = () => {
      clearCanvasLocally();
    };

    const handleRemoteBg = (bgDataUrl) => {
      setBgImage(bgDataUrl);
      setPdfFile(null);
    };
    
    const handleRemotePdf = (pdfDataUrl) => {
      setPdfFile(pdfDataUrl);
      setBgImage(null);
    };

    if (socket) {
      socket.on("whiteboard:onDraw", handleRemoteDraw);
      socket.on("whiteboard:onClear", handleRemoteClear);
      socket.on("whiteboard:onBg", handleRemoteBg);
      socket.on("whiteboard:onPdf", handleRemotePdf);
    }

    return () => {
      if (socket) {
        socket.off("whiteboard:onDraw", handleRemoteDraw);
        socket.off("whiteboard:onClear", handleRemoteClear);
        socket.off("whiteboard:onBg", handleRemoteBg);
        socket.off("whiteboard:onPdf", handleRemotePdf);
      }
    };
  }, [socket, myColor]);

  // Sync scroll positioning
  const isRemoteScrolling = useRef(false);

  useEffect(() => {
    const handleRemoteScroll = (scrollTop) => {
      if (scrollContainerRef.current) {
        isRemoteScrolling.current = true;
        scrollContainerRef.current.scrollTop = scrollTop;
        setTimeout(() => { isRemoteScrolling.current = false; }, 50);
      }
    };
    if (socket) {
      socket.on("whiteboard:onScroll", handleRemoteScroll);
      return () => socket.off("whiteboard:onScroll", handleRemoteScroll);
    }
  }, [socket]);

  const handleScroll = (e) => {
    if (isRemoteScrolling.current) return;
    if (socket) {
      socket.emit("whiteboard:scroll", { targetId: targetUserId, scrollTop: e.target.scrollTop });
    }
  };

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
    
    // Emit normalized coordinates
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
        color: myColor
      });
    }

    currentCoord.current = { x: offsetX, y: offsetY };
  };

  const stopDrawing = () => {
    if (contextRef.current) contextRef.current.closePath();
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        if (file.type === "application/pdf") {
           setPdfFile(dataUrl);
           setBgImage(null);
           if (socket) socket.emit("whiteboard:pdf", { targetId: targetUserId, pdfDataUrl: dataUrl });
        } else {
           setBgImage(dataUrl);
           setPdfFile(null);
           if (socket) socket.emit("whiteboard:bg", { targetId: targetUserId, bgDataUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-gray-900/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="h-16 bg-slate-100 border-b flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: myColor }}></span>
               Blueprint Collab
            </h3>
            <div className="h-6 w-px bg-slate-300 mx-2"></div>
            <label className="cursor-pointer bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all hover:border-indigo-300 hover:text-indigo-600">
              <FileText className="w-4 h-4" />
              Upload PDF or Image
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={clearCanvas} className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 flex items-center gap-2 transition-all">
              <Trash2 className="w-4 h-4" />
              Clear Ink
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Drawing & Document Area */}
        <div className="flex-1 relative w-full bg-slate-200/50 flex justify-center overflow-hidden">
           
           {/* Scrollable Container for Document */}
           <div ref={scrollContainerRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto overflow-x-hidden flex flex-col items-center py-4 hide-scrollbar">
              {bgImage && (
                <img src={bgImage} alt="Background" className="max-w-full h-auto object-contain shadow-md bg-white pointer-events-none" />
              )}
              {pdfFile && (
                <div className="w-full flex flex-col items-center pointer-events-none">
                  <Document file={pdfFile} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading={<div className="text-slate-500 font-medium py-10 animate-pulse">Loading Document...</div>}>
                    {Array.from(new Array(numPages || 0), (el, index) => (
                      <Page key={`page_${index + 1}`} pageNumber={index + 1} renderTextLayer={false} renderAnnotationLayer={false} width={800} className="mb-6 shadow-xl bg-white" />
                    ))}
                  </Document>
                </div>
              )}
           </div>

           {/* Glass Whiteboard Canvas Overlay */}
           <canvas
             ref={canvasRef}
             className="absolute inset-0 w-full h-full touch-none cursor-crosshair z-10"
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
