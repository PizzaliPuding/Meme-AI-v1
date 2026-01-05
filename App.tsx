
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Upload, 
  Download, 
  Trash2, 
  Layers, 
  Palette, 
  Type as TypeIcon, 
  Zap, 
  Search,
  Maximize2,
  RefreshCw,
  Plus,
  AlertCircle,
  Move
} from 'lucide-react';
import { getMagicCaptions, analyzeImageDeep, editImageAI } from './services/geminiService';
import TemplateGallery from './components/TemplateGallery';
import { MemeText, AnalysisResult } from './types';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [memeTexts, setMemeTexts] = useState<MemeText[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert URL to Base64 to avoid "Unable to process input image" errors
  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setMemeTexts([]);
        setAnalysis(null);
        setCaptions([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTemplateSelect = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const base64 = await urlToBase64(url);
      setImage(base64);
      setMemeTexts([]);
      setAnalysis(null);
      setCaptions([]);
    } catch (err) {
      setError("Failed to load template image.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const drawMeme = useCallback(() => {
    if (!canvasRef.current || !image) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image;
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate aspect ratio
      const canvasWidth = 600;
      const scale = canvasWidth / img.width;
      const canvasHeight = img.height * scale;
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw text
      memeTexts.forEach((text) => {
        ctx.font = `bold ${text.fontSize}px Impact`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = text.fontSize / 10;
        
        const lines = text.content.split('\n');
        lines.forEach((line, i) => {
          const y = text.y + (i * text.fontSize);
          ctx.strokeText(line.toUpperCase(), text.x, y);
          ctx.fillText(line.toUpperCase(), text.x, y);
        });
      });
    };
  }, [image, memeTexts]);

  useEffect(() => {
    drawMeme();
  }, [drawMeme]);

  // Drag and Drop Logic for Canvas
  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image || !canvasRef.current) return;
    const pos = getMousePos(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Check hit for each text (reverse order to pick top-most)
    for (let i = memeTexts.length - 1; i >= 0; i--) {
      const text = memeTexts[i];
      ctx.font = `bold ${text.fontSize}px Impact`;
      const lines = text.content.split('\n');
      const metrics = ctx.measureText(lines[0].toUpperCase());
      const width = metrics.width;
      const height = text.fontSize * lines.length;

      // Approximate bounding box check
      if (
        pos.x >= text.x - width / 2 - 10 &&
        pos.x <= text.x + width / 2 + 10 &&
        pos.y >= text.y - text.fontSize &&
        pos.y <= text.y + (lines.length - 1) * text.fontSize + 10
      ) {
        setDraggingId(text.id);
        setDragOffset({ x: pos.x - text.x, y: pos.y - text.y });
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingId || !image) return;
    const pos = getMousePos(e);
    setMemeTexts(prev => prev.map(t => 
      t.id === draggingId ? { ...t, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : t
    ));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const handleMagicCaption = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const suggested = await getMagicCaptions(image);
      setCaptions(suggested);
    } catch (err) {
      setError("AI was unable to process this image. Try a different one.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeepAnalysis = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeImageDeep(image);
      setAnalysis(result);
    } catch (err) {
      setError("Analysis failed. The image might be too complex or restricted.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIEdit = async () => {
    if (!image || !editPrompt) return;
    setLoading(true);
    setError(null);
    try {
      const newImage = await editImageAI(image, editPrompt);
      if (newImage) setImage(newImage);
      setEditPrompt('');
    } catch (err) {
      setError("AI editing failed. Try a simpler prompt.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addTextToMeme = (content: string, yPos?: number) => {
    const newText: MemeText = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      x: 300,
      y: yPos || 100,
      fontSize: 40
    };
    setMemeTexts([...memeTexts, newText]);
  };

  const downloadMeme = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'meme-genius.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
            <Sparkles className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            MemeGenius <span className="text-purple-400">AI</span>
          </h1>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-all border border-slate-600 shadow-sm"
          >
            <Upload size={18} />
            Upload Photo
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
            accept="image/*" 
          />
        </div>
      </header>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="text-red-500" size={20} />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500/50 hover:text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Canvas & Controls */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div 
            className="bg-slate-900 rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden relative group min-h-[400px] flex items-center justify-center select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            {image ? (
              <canvas 
                ref={canvasRef} 
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                className={`max-w-full h-auto ${draggingId ? 'cursor-grabbing' : 'cursor-grab'}`}
              />
            ) : (
              <div 
                className="flex flex-col items-center gap-4 text-slate-500 cursor-pointer p-20 text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-6 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors">
                  <Plus size={48} className="text-slate-600" />
                </div>
                <p className="text-xl font-medium">Select a template or upload an image to start memeing</p>
              </div>
            )}

            {image && (
               <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <Move size={14} className="text-purple-400" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Drag text to move</span>
               </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center backdrop-blur-sm z-50">
                <div className="relative">
                  <RefreshCw className="text-purple-500 animate-spin" size={64} />
                  <Sparkles className="absolute -top-2 -right-2 text-pink-400 animate-bounce" size={24} />
                </div>
                <p className="mt-4 text-xl font-bold animate-pulse text-purple-200">AI is cooking something funny...</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <button 
              disabled={!image || loading}
              onClick={handleMagicCaption}
              className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/20 transition-all transform hover:scale-[1.02] active:scale-95"
            >
              <Zap size={20} className="fill-current" />
              Magic Caption
            </button>
            <button 
              disabled={!image || loading}
              onClick={handleDeepAnalysis}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-2xl font-bold transition-all shadow-md"
            >
              <Search size={20} />
              Deep Scan
            </button>
            <button 
              disabled={!image || loading}
              onClick={downloadMeme}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-2xl font-bold transition-all shadow-md shadow-emerald-500/10"
            >
              <Download size={20} />
              Save Meme
            </button>
          </div>

          {/* AI Editor Tools */}
          <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Palette className="text-pink-400" size={20} />
              <h3 className="font-bold text-slate-300">AI Image Editor (Gemini 2.5)</h3>
            </div>
            <div className="flex gap-2">
              <input 
                type="text"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder='Try: "Make it look like a 90s VHS" or "Add a wizard hat"'
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                disabled={!image || loading}
              />
              <button 
                onClick={handleAIEdit}
                disabled={!image || loading || !editPrompt}
                className="bg-purple-600 hover:bg-purple-500 p-3 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center min-w-[48px]"
              >
                <Maximize2 size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Templates, Captions, Analysis */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-full">
          
          {/* Magic Captions Section */}
          {captions.length > 0 && (
            <div className="bg-indigo-950/30 p-6 rounded-3xl border border-indigo-500/30 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-indigo-200 text-lg flex items-center gap-2">
                  <Sparkles size={20} /> Magic Suggestions
                </h3>
                <button onClick={() => setCaptions([])} className="text-slate-500 hover:text-white transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {captions.map((cap, i) => (
                  <button
                    key={i}
                    onClick={() => addTextToMeme(cap, i === 0 ? 100 : undefined)}
                    className="text-left p-3 rounded-xl bg-indigo-900/50 hover:bg-indigo-800/70 border border-indigo-700/50 transition-colors text-sm font-medium"
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deep Analysis Result */}
          {analysis && (
            <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-600 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2">
                <Search size={20} /> Deep AI Insights
              </h3>
              <p className="text-sm text-slate-300 italic leading-relaxed">"{analysis.description}"</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-purple-900/40 text-purple-300 rounded-full text-xs font-bold border border-purple-500/30">
                  Vibe: {analysis.vibe}
                </span>
                {analysis.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs border border-slate-600">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Template Gallery Section */}
          <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 flex flex-col gap-4">
            <h3 className="font-bold text-slate-300 flex items-center gap-2">
              <Layers size={18} /> Hot Templates
            </h3>
            <TemplateGallery onSelect={handleTemplateSelect} />
          </div>

          {/* Text Controls */}
          {memeTexts.length > 0 && (
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 flex flex-col gap-4">
              <h3 className="font-bold text-slate-300 flex items-center gap-2">
                <TypeIcon size={18} /> Layers
              </h3>
              <div className="flex flex-col gap-3">
                {memeTexts.map((text) => (
                  <div key={text.id} className="flex flex-col gap-2 p-3 bg-slate-900 rounded-xl border border-slate-700 shadow-inner">
                    <textarea
                      value={text.content}
                      onChange={(e) => {
                        setMemeTexts(memeTexts.map(t => t.id === text.id ? {...t, content: e.target.value} : t));
                      }}
                      className="bg-transparent text-sm text-white focus:outline-none resize-none placeholder-slate-600"
                      placeholder="Enter meme text..."
                    />
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1">
                         <span className="text-[10px] text-slate-500 uppercase font-bold min-w-[30px]">Size</span>
                         <input 
                           type="range" 
                           min="10" 
                           max="120" 
                           value={text.fontSize}
                           onChange={(e) => {
                             setMemeTexts(memeTexts.map(t => t.id === text.id ? {...t, fontSize: parseInt(e.target.value)} : t));
                           }}
                           className="w-full accent-purple-500"
                         />
                      </div>
                      <button 
                        onClick={() => setMemeTexts(memeTexts.filter(t => t.id !== text.id))}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => addTextToMeme("New Caption", 300)}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold transition-colors"
              >
                + Add Text Layer
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-8 text-slate-500 text-sm border-t border-slate-800">
        <p>Built with Gemini 3 Pro & 2.5 Flash • No more boring memes.</p>
      </footer>
    </div>
  );
};

export default App;
