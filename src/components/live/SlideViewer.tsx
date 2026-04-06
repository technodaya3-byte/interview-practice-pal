import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Upload, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface SlideViewerProps {
  sessionId: string;
  isPresenter: boolean;
  currentSlide: number;
  totalSlides: number;
  presentationUrl: string | null;
  onSlideChange?: (slide: number, total: number) => void;
}

export function SlideViewer({
  sessionId,
  isPresenter,
  currentSlide,
  totalSlides,
  presentationUrl,
  onSlideChange,
}: SlideViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;
    const page = await pdfDoc.getPage(pageNum + 1);
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const containerWidth = container.clientWidth;
    const viewport = page.getViewport({ scale: 1 });
    const scale = containerWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
  }, [pdfDoc]);

  // Load PDF
  useEffect(() => {
    if (!presentationUrl) return;
    setLoading(true);
    pdfjsLib.getDocument(presentationUrl).promise.then((doc) => {
      setPdfDoc(doc);
      onSlideChange?.(0, doc.numPages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [presentationUrl]);

  // Render current slide
  useEffect(() => {
    renderPage(currentSlide);
  }, [currentSlide, pdfDoc, renderPage]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => renderPage(currentSlide);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentSlide, renderPage]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const path = `${sessionId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("presentations").upload(path, file);
    if (error) { setLoading(false); return; }
    const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(path);

    await supabase.from("live_sessions").update({
      presentation_url: urlData.publicUrl,
      current_slide: 0,
    }).eq("id", sessionId);

    setLoading(false);
  };

  const goToSlide = async (slide: number) => {
    if (slide < 0 || slide >= totalSlides) return;
    await supabase.from("live_sessions").update({ current_slide: slide }).eq("id", sessionId);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      <div className="flex-1 relative flex items-center justify-center bg-black/5 dark:bg-black/20 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        {!presentationUrl && !loading ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-muted-foreground text-sm">No presentation uploaded yet</p>
            {isPresenter && (
              <label className="cursor-pointer">
                <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-2" /> Upload PDF</span>
                </Button>
              </label>
            )}
          </div>
        ) : (
          <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
        )}
      </div>

      {totalSlides > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            {isPresenter && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goToSlide(currentSlide - 1)} disabled={currentSlide === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goToSlide(currentSlide + 1)} disabled={currentSlide >= totalSlides - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {currentSlide + 1} / {totalSlides}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isPresenter && presentationUrl && (
        <div className="px-4 pb-2">
          <label className="cursor-pointer">
            <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Upload className="h-3 w-3 mr-1" /> Replace PDF
            </Button>
          </label>
        </div>
      )}
    </div>
  );
}
