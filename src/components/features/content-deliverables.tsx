'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Film, Volume2, ImageIcon, FileCheck, Info, FileCode, Monitor, LayoutGrid, FileOutput, Trash2, FileImage } from 'lucide-react';
import { useProjectContext } from '@/contexts/project-context';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Separator } from '@/components/ui/separator';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

const gcd = (a: number, b: number): number => {
  if (!isFinite(a) || !isFinite(b) || a === 0 || b === 0) return 1;
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  if (b > a) { let temp = a; a = b; b = temp; }
  while (true) {
    if (b === 0) return a;
    a %= b;
    if (a === 0) return b;
    b %= a;
  }
};

const PROJECTION_COLORS = [
    '#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777', '#4B5563', '#0891B2',
];

const MiniPixelMap = ({ screen, ledProducts, id, name, resolution, onDownload }: { screen: any, ledProducts: any[], id: string, name: string, resolution: string, onDownload?: () => void }) => {
    const { ledScreenWidth, ledScreenHeight, isMixed, ledScreenHalfWidth, ledScreenHalfHeight, tileColor1, tileColor2, externalMapUrl, color, halfPanelPosition, ledHalfProduct } = screen;
    
    if (externalMapUrl) {
        return (
            <button onClick={(e) => { e.preventDefault(); onDownload?.(); }} className="w-[60px] h-[34px] rounded-sm shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden flex flex-col items-center justify-center text-white text-center">
                <img src={externalMapUrl} alt="External Map" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10" style={{ fontSize: '8px', fontWeight: '900', lineHeight: '1', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>{id}</div>
                <div className="relative z-10" style={{ fontSize: '3px', fontWeight: '800', marginTop: '1px', textTransform: 'uppercase', maxWidth: '90%', textShadow: '0 0 3px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <div className="relative z-10" style={{ fontSize: '2.5px', fontWeight: '600', marginTop: '0.5px', opacity: '0.8', textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>{resolution}</div>
            </button>
        );
    }

    if (!ledScreenWidth || !ledScreenHeight) {
        return (
            <button onClick={(e) => { e.preventDefault(); onDownload?.(); }} className="w-[60px] h-[34px] rounded-sm shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden flex flex-col items-center justify-center text-white text-center" style={{ backgroundColor: color || 'var(--primary)' }}>
                <div className="relative z-10" style={{ fontSize: '8px', fontWeight: '900', lineHeight: '1', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>{id}</div>
                <div className="relative z-10" style={{ fontSize: '3px', fontWeight: '800', marginTop: '1px', textTransform: 'uppercase', maxWidth: '90%', textShadow: '0 0 3px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <div className="relative z-10" style={{ fontSize: '2.5px', fontWeight: '600', marginTop: '0.5px', opacity: '0.8', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>{resolution}</div>
            </button>
        );
    }

    const halfProductData = isMixed ? ledProducts.find((p: any) => p.manufacturer === screen.ledManufacturer && p.name === screen.ledHalfProduct) : undefined;
    const cols = ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0);
    const rows = ledScreenHeight + (isMixed && ledScreenHalfHeight > 0 ? 1 : 0);
    
    const maxSize = 60;
    const aspectRatio = cols / rows;
    let width = maxSize;
    let height = maxSize / aspectRatio;
    if (height > maxSize) {
        height = maxSize;
        width = maxSize * aspectRatio;
    }

    const gap = 1;
    const cellW = (width - (cols - 1) * gap) / cols;
    const cellH = (height - (rows - 1) * gap) / rows;

    return (
        <button onClick={(e) => { e.preventDefault(); onDownload?.(); }} title="Click to download full pixel map" className="inline-flex flex-col transition-transform hover:scale-105 active:scale-95 cursor-pointer border-none bg-transparent p-0 relative overflow-hidden" style={{ width: `${width}px`, height: `${height}px`, gap: `${gap}px` }}>
            {Array.from({ length: rows }).map((_, r) => {
                const isHalfH = isMixed && ledScreenHalfHeight > 0 && r === 0;
                return (
                    <div key={r} className="flex" style={{ gap: `${gap}px`, height: isHalfH ? `${cellH/2}px` : `${cellH}px` }}>
                        {Array.from({ length: cols }).map((_, c) => {
                            const isEven = (r + c) % 2 === 0;
                            let isHalfW = false;
                            if (isMixed && ledScreenHalfWidth > 0) {
                                if (halfPanelPosition === 'left') isHalfW = c === 0;
                                else isHalfW = c === cols - 1;
                            }
                            return <div key={c} className="shrink-0" style={{ width: isHalfW ? `${cellW/2}px` : `${cellW}px`, height: '100%', backgroundColor: isEven ? tileColor1 : tileColor2 }} />;
                        })}
                    </div>
                );
            })}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 10 }}>
                <div style={{ fontSize: `${height * 0.25}px`, fontWeight: '900', margin: '0', lineHeight: '1', textShadow: '0 0 5px rgba(0,0,0,0.8)' }}>{id}</div>
                <div style={{ fontSize: `${height * 0.08}px`, fontWeight: '800', marginTop: '2px', textTransform: 'uppercase', maxWidth: '90%', textShadow: '0 0 3px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                <div style={{ fontSize: `${height * 0.06}px`, fontWeight: '600', marginTop: '1px', opacity: '0.8', letterSpacing: '0.05em', textShadow: '0 0 2px rgba(0,0,0,0.8)' }}>{resolution}</div>
            </div>
        </button>
    );
};

const MiniProjectionMap = ({ id, name, resolution, color, onDownload }: { id: string, name: string, resolution: string, color: string, onDownload?: () => void }) => {
    return (
        <button onClick={(e) => { e.preventDefault(); onDownload?.(); }} title="Click to download pixel-accurate map" className="w-[60px] h-[34px] rounded-sm shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden flex flex-col items-center justify-center text-white text-center" style={{ backgroundColor: color }}>
            <div style={{ fontSize: '8px', fontWeight: '900', lineHeight: '1', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>{id}</div>
            <div style={{ fontSize: '3px', fontWeight: '800', marginTop: '1px', textTransform: 'uppercase', maxWidth: '90%', textShadow: '0 0 3px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: '2.5px', fontWeight: '600', marginTop: '0.5px', opacity: '0.8', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>{resolution}</div>
        </button>
    );
};

const FullPixelMapCapture = ({ screen, ledProducts, containerRef, id, name, resolution }: { screen: any, ledProducts: any[], containerRef: any, id: string, name: string, resolution: string }) => {
    const { 
        ledScreenWidth, ledScreenHeight, isMixed, ledScreenHalfWidth, ledScreenHalfHeight, 
        ledTileWidthPx, ledTileHeightPx, borderColor, 
        tileColor1, tileColor2, halfPanelPosition, ledHalfProduct,
        tileNumbering, tileNumberSize, tileNumberColor, externalMapUrl, color, overlayTexts
    } = screen;

    const getProcessedText = (text: string) => {
        let totalWidthPx = ledScreenWidth * ledTileWidthPx;
        if (isMixed && ledScreenHalfWidth > 0) {
            totalWidthPx += (ledTileWidthPx / 2);
        }
        let totalHeightPx = ledScreenHeight * ledTileHeightPx;
        if (isMixed && ledScreenHalfHeight > 0) {
            totalHeightPx += (ledTileHeightPx / 2);
        }
        return text
            .replace('{width}', totalWidthPx.toString())
            .replace('{height}', totalHeightPx.toString())
            .replace('{name}', screen.name);
    };

    if (externalMapUrl) {
        return (
            <div ref={containerRef} className="relative inline-flex flex-col items-center justify-center" style={{ backgroundColor: borderColor || '#000000', fontFamily: 'var(--font-space-mono), monospace' }}>
                <img src={externalMapUrl} alt="Export Asset" className="relative z-0" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 10 }}>
                    <div style={{ fontSize: '150px', fontWeight: '900', margin: '0', lineHeight: '1', textShadow: '0 0 20px rgba(0,0,0,0.8)' }}>{id}</div>
                    <div style={{ fontSize: '60px', fontWeight: '800', marginTop: '20px', textTransform: 'uppercase', maxWidth: '80%', textShadow: '0 0 15px rgba(0,0,0,0.8)' }}>{name}</div>
                    <div style={{ fontSize: '40px', fontWeight: '600', marginTop: '10px', opacity: '0.8', letterSpacing: '0.1em', textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>{resolution}</div>
                </div>
            </div>
        );
    }

    if (!ledScreenWidth || !ledScreenHeight) {
        const parts = resolution.split(/[x×]/i).map(p => parseInt(p.trim()));
        const w = parts[0] || 1920;
        const h = parts[1] || 1080;
        const minDim = Math.min(w, h);
        return (
            <div ref={containerRef} className="flex flex-col items-center justify-center text-white text-center" style={{ width: `${w}px`, height: `${h}px`, backgroundColor: color || '#0F172A', fontFamily: 'var(--font-space-mono), monospace' }}>
                <div style={{ fontSize: `${minDim * 0.15}px`, fontWeight: '900', margin: '0', lineHeight: '1', textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>{id}</div>
                <div style={{ fontSize: `${minDim * 0.06}px`, fontWeight: '800', marginTop: '20px', textTransform: 'uppercase', maxWidth: '80%', textShadow: '0 0 15px rgba(0,0,0,0.5)' }}>{name}</div>
                <div style={{ fontSize: `${minDim * 0.04}px`, fontWeight: '600', marginTop: '10px', opacity: '0.8', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>{resolution}</div>
            </div>
        );
    }

    const halfProductData = isMixed ? ledProducts.find((p: any) => p.manufacturer === screen.ledManufacturer && p.name === ledHalfProduct) : undefined;
    const numCols = ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0);
    const numRows = ledScreenHeight + (isMixed && ledScreenHalfHeight > 0 ? 1 : 0);

    const getTileLabel = (row: number, col: number) => {
        if (!tileNumbering || tileNumbering === 'none') return null;
        switch (tileNumbering) {
            case 'sequential': return (row * numCols + col + 1).toString();
            case 'col-row': return `${col + 1}-${row + 1}`;
            case 'row-col': return `${String.fromCharCode(65 + row)}${col + 1}`;
            default: return null;
        }
    };

    let totalWidthPx = ledScreenWidth * ledTileWidthPx + (isMixed && ledScreenHalfWidth > 0 && halfProductData ? halfProductData.width_px : 0);
    let totalHeightPx = ledScreenHeight * ledTileHeightPx + (isMixed && ledScreenHalfHeight > 0 && halfProductData ? halfProductData.height_px : 0);
    const minDim = Math.min(totalWidthPx, totalHeightPx);

    return (
        <div ref={containerRef} className="relative inline-flex flex-col" style={{ width: `${totalWidthPx}px`, height: `${totalHeightPx}px`, backgroundColor: borderColor, gap: `0px`, fontFamily: 'var(--font-space-mono), monospace' }}>
            {Array.from({ length: numRows }).map((_, r) => {
                const isHalfRow = isMixed && ledScreenHalfHeight > 0 && r === 0;
                const rowHeight = isHalfRow && halfProductData ? halfProductData.height_px : ledTileHeightPx;
                return (
                    <div key={r} className="flex" style={{ gap: `0px`, height: `${rowHeight}px` }}>
                        {isMixed && ledScreenHalfWidth > 0 && halfPanelPosition === 'left' && halfProductData && (
                            <div className="relative flex items-center justify-center" style={{ width: `${halfProductData.width_px}px`, height: '100%', backgroundColor: (r + 0) % 2 === 0 ? tileColor1 : tileColor2 }}>
                                {getTileLabel(r, 0) && <span className="font-bold" style={{ fontSize: `${tileNumberSize}px`, color: tileNumberColor, textShadow: '0 0 5px rgba(0,0,0,0.7)' }}>{getTileLabel(r, 0)}</span>}
                            </div>
                        )}
                        {Array.from({ length: ledScreenWidth }).map((_, c) => {
                            const colIndex = (isMixed && ledScreenHalfWidth > 0 && halfPanelPosition === 'left') ? c + 1 : c;
                            const isEven = (r + colIndex) % 2 === 0;
                            const label = getTileLabel(r, colIndex);
                            return (
                                <div key={c} style={{ width: `${ledTileWidthPx}px`, height: '100%', backgroundColor: isEven ? tileColor1 : tileColor2 }} className="relative flex items-center justify-center">
                                    {label && <span className="font-bold" style={{ fontSize: `${tileNumberSize}px`, color: tileNumberColor, textShadow: '0 0 5px rgba(0,0,0,0.7)' }}>{label}</span>}
                                </div>
                            );
                        })}
                        {isMixed && ledScreenHalfWidth > 0 && halfPanelPosition === 'right' && halfProductData && (
                            <div className="relative flex items-center justify-center" style={{ width: `${halfProductData.width_px}px`, height: '100%', backgroundColor: (r + ledScreenWidth) % 2 === 0 ? tileColor1 : tileColor2 }}>
                                {getTileLabel(r, ledScreenWidth) && <span className="font-bold" style={{ fontSize: `${tileNumberSize}px`, color: tileNumberColor, textShadow: '0 0 5px rgba(0,0,0,0.7)' }}>{getTileLabel(r, ledScreenWidth)}</span>}
                            </div>
                        )}
                    </div>
                );
            })}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 10 }}>
                <div style={{ fontSize: `${minDim * 0.15}px`, fontWeight: '900', margin: '0', lineHeight: '1', textShadow: '0 0 20px rgba(0,0,0,0.8)' }}>{id}</div>
                <div style={{ fontSize: `${minDim * 0.06}px`, fontWeight: '800', marginTop: '20px', textTransform: 'uppercase', maxWidth: '80%', textShadow: '0 0 15px rgba(0,0,0,0.8)' }}>{name}</div>
                <div style={{ fontSize: `${minDim * 0.04}px`, fontWeight: '600', marginTop: '10px', opacity: '0.8', letterSpacing: '0.1em', textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>{resolution}</div>
            </div>
            {overlayTexts?.map((ot: any) => (
                <div
                    key={ot.id}
                    style={{
                        position: 'absolute',
                        left: `${ot.position.x}px`,
                        top: `${ot.position.y}px`,
                        transform: 'translate(-50%, -50%)', 
                        textAlign: 'center', 
                        color: ot.color,
                        fontSize: `${ot.fontSize}px`,
                        fontWeight: 'bold',
                        fontFamily: ot.fontFamily || 'var(--font-space-mono), monospace',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {getProcessedText(ot.text)}
                </div>
            ))}
        </div>
    );
};

const FullProjectionMapCapture = ({ screen, id, name, color, containerRef }: { screen: any, id: string, name: string, color: string, containerRef: any }) => {
    const res = screen.resolution || '1920 x 1080';
    const [w, h] = res.split(/[x×]/i).map((p: string) => parseInt(p.trim()));
    if (isNaN(w) || isNaN(h)) return null;
    const minDim = Math.min(w, h);
    return (
        <div ref={containerRef} className="flex flex-col items-center justify-center text-white text-center" style={{ width: `${w}px`, height: `${h}px`, backgroundColor: color, fontFamily: 'var(--font-space-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
            <div style={{ fontSize: `${minDim * 0.15}px`, fontWeight: '900', margin: '0', lineHeight: '1', textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>{id}</div>
            <div style={{ fontSize: `${minDim * 0.06}px`, fontWeight: '800', marginTop: '20px', textTransform: 'uppercase', maxWidth: '80%', textShadow: '0 0 15px rgba(0,0,0,0.5)' }}>{name}</div>
            <div style={{ fontSize: `${minDim * 0.04}px`, fontWeight: '600', marginTop: '10px', opacity: '0.8', letterSpacing: '0.1em', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>{res}</div>
        </div>
    );
};

export default function ContentDeliverables() {
  const { state } = useProjectContext();
  const { deliverables, pixelMaps, ledProducts, projectName } = state;
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [signature, setSignature] = useState('');
  const { toast } = useToast();
  const captureRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
    setSignature(`TS-AUTH-SYS-${Math.random().toString(36).substring(2, 11).toUpperCase()}`);
  }, []);

  const downloadSingleMap = async (id: string, displayId: string, name: string, resolution: string, bg: string) => {
    const element = captureRefs.current[id];
    if (!element) return;
    try {
        const dataUrl = await toPng(element, { 
            cacheBust: true, 
            backgroundColor: bg, 
            pixelRatio: 1,
            style: { fontFamily: 'var(--font-space-mono), monospace' }
        });
        const sanitizedName = name.replace(/\s+/g, '_');
        const sanitizedRes = resolution.replace(/\s*[×x]\s*/g, 'x').replace(/\s+/g, '');
        const link = document.createElement('a');
        link.download = `MAP_${displayId}_${sanitizedName}_${sanitizedRes}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) { toast({ variant: 'destructive', title: 'Download Failed' }); }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('technical-report-preview');
    if (!element) return;
    setIsGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const dataUrl = await toPng(element, { 
        cacheBust: true, 
        backgroundColor: 'hsl(var(--background))', 
        pixelRatio: 3,
        style: { fontFamily: 'var(--font-space-mono), monospace' }
      });
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeightOnPdf = (imgProps.height * pdfWidth) / imgProps.width;
      let heightLeft = imgHeightOnPdf;
      let position = 0;
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
        heightLeft -= pdfHeight;
      }
      pdf.save(`PROJECT_DELIVERABLES_${(deliverables.projectName || projectName || 'Project').replace(/\s+/g, '_')}.pdf`);
    } finally { setIsGenerating(false); }
  };

  const handleDownloadHTML = async () => {
    const element = document.getElementById('technical-report-preview');
    if (!element) return;
    setIsGenerating(true);
    try {
        let allStyles = '';
        try { for (let i = 0; i < document.styleSheets.length; i++) { const sheet = document.styleSheets[i]; try { const rules = sheet.cssRules || (sheet as any).rules; if (rules) for (let j = 0; j < rules.length; j++) allStyles += rules[j].cssText + '\n'; } catch (e) {} } } catch (e) {}
        
        const mapImages: Record<string, string> = {};
        for (const row of ledData) { 
            const captureEl = captureRefs.current[row.raw.id]; 
            if (captureEl) mapImages[row.raw.id] = await toPng(captureEl, { 
                cacheBust: true, 
                backgroundColor: row.raw.color || row.raw.borderColor || '#000000', 
                pixelRatio: 1,
                style: { fontFamily: 'var(--font-space-mono), monospace' }
            }); 
        }
        for (const row of projectionData) { 
            const captureEl = captureRefs.current[row.raw.id]; 
            if (captureEl) mapImages[row.raw.id] = await toPng(captureEl, { 
                cacheBust: true, 
                backgroundColor: row.color, 
                pixelRatio: 1,
                style: { fontFamily: 'var(--font-space-mono), monospace' }
            }); 
        }

        const clone = element.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.mini-map-container').forEach((container) => {
            const screenId = container.getAttribute('data-screen-id');
            if (screenId && mapImages[screenId]) {
                const row = [...ledData, ...projectionData].find(r => r.raw.id === screenId);
                const link = document.createElement('a');
                link.href = mapImages[screenId];
                if (row) link.download = `MAP_${row.id}_${row.name.replace(/\s+/g, '_')}_${row.resolution.replace(/\s*[×x]\s*/g, 'x').replace(/\s+/g, '')}.png`;
                link.innerHTML = container.innerHTML;
                link.className = container.className;
                container.parentNode?.replaceChild(link, container);
            }
        });

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Technical Specification - ${deliverables.projectName || projectName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        ${allStyles}
        :root { --font-space-mono: 'Space Mono', monospace; }
        body { 
            background-color: #0F172A; 
            margin: 0; 
            display: flex; 
            justify-content: center; 
            padding: 40px 20px; 
            font-family: 'Space Mono', monospace; 
        }
        #exported-report { 
            width: 100%; 
            max-width: 800px; 
            background: white; 
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
            color: black;
        }
        .bg-card { background-color: white !important; color: black !important; }
        .text-foreground { color: black !important; }
        .border-border { border-color: #e2e8f0 !important; }
        .bg-primary { background-color: #1e3a8a !important; color: white !important; }
        .text-primary-foreground { color: white !important; }
        .bg-muted { background-color: #f1f5f9 !important; }
        .text-muted-foreground { color: #64748b !important; }
        * { font-family: 'Space Mono', monospace !important; }
    </style>
</head>
<body>
    <div id="exported-report">${clone.innerHTML}</div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PROJECT_DELIVERABLES_${(deliverables.projectName || projectName || 'Project').replace(/\s+/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } finally { setIsGenerating(false); }
  };

  const ledData = useMemo(() => {
    const engineering = pixelMaps.filter(p => (p.ledManufacturer && (p.ledProduct || p.ledManufacturer === 'Custom')) || p.externalMapUrl).map((screen) => {
      const halfProduct = screen.isMixed ? ledProducts.find(p => p.manufacturer === screen.ledManufacturer && p.name === screen.ledHalfProduct) : undefined;
      let res = screen.externalMapUrl && screen.externalMapResolution ? screen.externalMapResolution : `${screen.ledScreenWidth * screen.ledTileWidthPx + (screen.isMixed && screen.ledScreenHalfWidth > 0 && halfProduct ? halfProduct.width_px : 0)} × ${screen.ledScreenHeight * screen.ledTileHeightPx + (screen.isMixed && screen.ledScreenHalfHeight > 0 && halfProduct ? halfProduct.height_px : 0)}`;
      
      const parts = res.split(/[x×]/i).map(p => parseInt(p.trim()));
      let aspect = 'N/A'; 
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) { 
          const common = gcd(parts[0], parts[1]); 
          const decimal = (parts[0] / parts[1]).toFixed(2);
          aspect = `${parts[0]/common}:${parts[1]/common} (${decimal}:1)`; 
      }
      return { name: screen.name.toUpperCase(), resolution: res, aspect, raw: screen };
    });

    const external = (deliverables.externalLedAssets || []).map((asset) => {
        const parts = asset.externalMapResolution.split(/[x×]/i).map(p => parseInt(p.trim()));
        let aspect = 'N/A';
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const common = gcd(parts[0], parts[1]);
            const decimal = (parts[0] / parts[1]).toFixed(2);
            aspect = `${parts[0]/common}:${parts[1]/common} (${decimal}:1)`;
        }
        return {
            name: (asset.name || 'External Asset').toUpperCase(),
            resolution: asset.externalMapResolution,
            aspect,
            raw: {
                ...asset,
                borderColor: '#000000',
            }
        };
    });

    return [...engineering, ...external].map((row, idx) => ({
        ...row,
        id: `L${(idx + 1).toString().padStart(2, '0')}`
    }));
  }, [pixelMaps, ledProducts, deliverables.externalLedAssets]);

  const projectionData = useMemo(() => (deliverables.projectionScreens || []).map((screen, idx) => {
      const res = screen.resolution || '1920 × 1080';
      const parts = res.split(/[x×]/i).map(p => parseInt(p.trim()));
      let aspect = 'N/A'; 
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) { 
          const common = gcd(parts[0], parts[1]); 
          const decimal = (parts[0] / parts[1]).toFixed(2);
          aspect = `${parts[0]/common}:${parts[1]/common} (${decimal}:1)`; 
      }
      return { id: `P${(idx + 1).toString().padStart(2, '0')}`, name: (screen.name || 'UNNAMED PROJECTOR').toUpperCase(), resolution: res, aspect, color: PROJECTION_COLORS[idx % PROJECTION_COLORS.length], raw: screen };
  }), [deliverables.projectionScreens]);

  const isAnyLedConfigured = ledData.length > 0;
  let sectionIndex = 1;
  const getNextSection = () => (sectionIndex++).toString().padStart(2, '0');

  return (
    <div className="w-full h-full flex flex-col items-center justify-start bg-background overflow-auto font-sans">
      <div className="w-full max-w-4xl pb-20">
        <div className="fixed top-[-10000px] left-[-10000px] pointer-events-none">
            {ledData.map((row) => (
                <FullPixelMapCapture key={row.raw.id} screen={row.raw} ledProducts={ledProducts} containerRef={(el: any) => captureRefs.current[row.raw.id] = el} id={row.id} name={row.name} resolution={row.resolution} />
            ))}
            {projectionData.map((row) => (
                <FullProjectionMapCapture key={row.raw.id} screen={row.raw} id={row.id} name={row.name} color={row.color} containerRef={(el: any) => captureRefs.current[row.raw.id] = el} />
            ))}
        </div>
        <Card className="bg-card border-border shadow-2xl rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
            <CardTitle className="text-xl font-bold text-foreground tracking-tight">Project Deliverables</CardTitle>
            <div className="flex items-center gap-3">
              <Button onClick={handleDownloadPDF} disabled={isGenerating} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-6 rounded-lg shadow-lg transition-all active:scale-95">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} {isGenerating ? 'GENERATING...' : 'PDF'}
              </Button>
              <Button onClick={handleDownloadHTML} disabled={isGenerating} variant="outline" className="h-11 px-6 rounded-lg shadow-lg transition-all active:scale-95 border-border">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Monitor className="mr-2 h-4 w-4" />} HTML
              </Button>
            </div>
          </CardHeader>
        </Card>
        <div id="technical-report-preview" className="bg-card text-foreground rounded-none shadow-2xl overflow-hidden border border-border" style={{ minHeight: '1123px', fontFamily: 'var(--font-space-mono), monospace' }}>
          <div className="relative bg-primary p-12 text-primary-foreground border-b-4 border-accent">
            <div className="flex justify-between items-start mb-8">
              <h1 className="text-3xl font-black uppercase tracking-tight leading-none">{deliverables.projectName || projectName || 'PROJECT IDENTIFIER'}</h1>
              <div className="text-right space-y-1"><p className="text-[10px] font-bold text-primary-foreground/60 uppercase tracking-widest">Issue Date</p><p className="text-sm font-black text-primary-foreground">{currentDate}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-primary-foreground/10">
              <div className="space-y-1"><p className="text-[9px] font-bold text-primary-foreground/60 uppercase tracking-widest">Document ID</p><p className="text-xs font-black">{deliverables.projectNumber || 'UNASSIGNED'}</p></div>
              <div className="text-right space-y-1"><p className="text-[9px] font-bold text-primary-foreground/60 uppercase tracking-widest">Revision</p><p className="text-xs font-black">v{deliverables.projectVersion || '01'}</p></div>
            </div>
          </div>
          <div className="p-12 space-y-16">
            {deliverables.showLedSection && (
                <section className="space-y-8">
                    <div className="flex items-center gap-4"><div className="h-8 w-1.5 bg-accent" /><h3 className="text-xl font-black uppercase tracking-widest text-foreground">{getNextSection()}. LED Configuration</h3></div>
                    <div className="overflow-hidden border border-border rounded-lg shadow-sm">
                        {!isAnyLedConfigured ? <div className="p-12 text-center bg-muted/30"><p className="text-muted-foreground italic text-sm">Please configure LED hardware or upload technical assets.</p></div> : (
                            <table className="w-full text-xs text-left border-collapse">
                                <thead><tr className="bg-muted text-muted-foreground border-b border-border"><th className="py-4 px-6 font-bold uppercase tracking-widest text-left w-24">Map Preview</th><th className="py-4 px-6 font-bold uppercase tracking-widest w-20">Screen ID</th><th className="py-4 px-6 font-bold uppercase tracking-widest">Deliverables</th><th className="py-4 px-6 font-bold uppercase tracking-widest">Resolution</th><th className="py-4 px-6 font-bold uppercase tracking-widest">Aspect Ratio</th></tr></thead>
                                <tbody className="divide-y divide-border">{ledData.map((row) => (
                                    <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="py-4 px-6"><div className="mini-map-container" data-screen-id={row.raw.id}><MiniPixelMap screen={row.raw} ledProducts={ledProducts} id={row.id} name={row.name} resolution={row.resolution} onDownload={() => downloadSingleMap(row.raw.id, row.id, row.name, row.resolution, row.raw.color || row.raw.borderColor || '#000000')} /></div></td>
                                        <td className="py-4 px-6 font-bold text-accent">{row.id}</td><td className="py-4 px-6 font-black text-foreground">{row.name}</td><td className="py-4 px-6 text-muted-foreground">{row.resolution}</td><td className="py-4 px-6 text-muted-foreground">{row.aspect}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        )}
                    </div>
                </section>
            )}
            {deliverables.showProjectionSection && (
                <section className="space-y-8">
                    <div className="flex items-center gap-4"><div className="h-8 w-1.5 bg-accent" /><h3 className="text-xl font-black uppercase tracking-widest text-foreground">{getNextSection()}. Projection Configuration</h3></div>
                    <div className="overflow-hidden border border-border rounded-lg shadow-sm">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead><tr className="bg-muted text-muted-foreground border-b border-border"><th className="py-4 px-6 font-bold uppercase tracking-widest text-left w-24">Map Preview</th><th className="py-4 px-6 font-bold uppercase tracking-widest w-20">Screen ID</th><th className="py-4 px-6 font-bold uppercase tracking-widest">Deliverables</th><th className="py-4 px-6 font-bold uppercase tracking-widest">Resolution</th><th className="py-4 px-6 font-bold uppercase tracking-widest">Aspect Ratio</th></tr></thead>
                            <tbody className="divide-y divide-border">{projectionData.map((row) => (
                                <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="py-4 px-6"><div className="mini-map-container" data-screen-id={row.raw.id}><MiniProjectionMap id={row.id} name={row.name} resolution={row.resolution} color={row.color} onDownload={() => downloadSingleMap(row.raw.id, row.id, row.name, row.resolution, row.color)} /></div></td>
                                    <td className="py-4 px-6 font-bold text-accent">{row.id}</td><td className="py-4 px-6 font-black text-foreground">{row.name}</td><td className="py-4 px-6 text-muted-foreground">{row.resolution}</td><td className="py-4 px-6 text-muted-foreground">{row.aspect}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </section>
            )}
            <section className="space-y-8">
                <div className="flex items-center gap-4"><div className="h-8 w-1.5 bg-accent" /><h3 className="text-xl font-black uppercase tracking-widest text-foreground">{getNextSection()}. Playback Requirements</h3></div>
                <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center p-6 bg-card border border-border rounded-lg shadow-sm group">
                        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mr-6 group-hover:bg-accent transition-colors"><Film className="w-6 h-6 text-accent group-hover:text-accent-foreground transition-colors" /></div>
                        <div className="flex-1 space-y-3"><h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Video Processing</h4><div className="flex flex-wrap gap-2">{deliverables.selectedFrameRates.map(rate => (<span key={rate} className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded uppercase tracking-tighter">{rate}</span>))}{deliverables.selectedCodecs.map(codec => (<span key={codec} className="px-3 py-1 bg-accent text-accent-foreground font-bold text-[10px] rounded uppercase tracking-wider">{codec}</span>))}</div></div>
                    </div>
                    <div className="flex items-center p-6 bg-card border border-border rounded-lg shadow-sm group">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mr-6 group-hover:bg-emerald-500 transition-colors"><Volume2 className="w-6 h-6 text-emerald-500 group-hover:text-white transition-colors" /></div>
                        <div className="flex-1 space-y-3"><h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Audio Integration</h4><div className="flex flex-wrap gap-2">{deliverables.selectedAudioFormats.map(format => (<span key={format} className="px-3 py-1 bg-emerald-500 text-white font-bold text-[10px] rounded uppercase tracking-wider">{format}</span>))}{deliverables.selectedAudioSampleRates.map(rate => (<span key={rate} className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded uppercase">{rate}</span>))}{deliverables.selectedAudioBitDepths.map(depth => (<span key={depth} className="px-3 py-1 bg-muted text-muted-foreground border border-border font-bold text-[10px] rounded">{depth}</span>))}</div></div>
                    </div>
                    <div className="flex items-center p-6 bg-card border border-border rounded-lg shadow-sm group">
                        <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mr-6 group-hover:bg-purple-500 transition-colors"><ImageIcon className="w-6 h-6 text-purple-500 group-hover:text-white transition-colors" /></div>
                        <div className="flex-1 space-y-3"><h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Still Imagery</h4><div className="flex flex-wrap gap-2">{deliverables.selectedImageFormats.map(format => (<span key={format} className="px-3 py-1 bg-purple-500 text-white font-bold text-[10px] rounded uppercase tracking-wider">{format}</span>))}</div></div>
                    </div>
                </div>
            </section>
            {deliverables.showLedSection && isAnyLedConfigured && (
                <section className="space-y-8 pt-8">
                    <div className="flex items-center gap-4"><div className="h-8 w-1.5 bg-accent" /><h3 className="text-xl font-black uppercase tracking-widest text-foreground">{getNextSection()}. Screen Technical Breakdown (LED)</h3></div>
                    <div className="space-y-12">{ledData.map((row) => (
                        <div key={row.id} className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-card border border-border rounded-lg shadow-sm relative overflow-hidden group">
                            <div className="space-y-6"><div className="flex items-center gap-3"><span className="text-2xl font-black text-accent leading-none">{row.id}</span><h4 className="text-lg font-black uppercase text-foreground tracking-tight">{row.name}</h4></div>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Hardware Brand</p><p className="text-xs font-black text-foreground">{row.raw.ledManufacturer || row.raw.manufacturer || 'N/A'}</p></div>
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Product Name</p><p className="text-xs font-black text-foreground">{row.raw.ledProduct || row.raw.product || 'N/A'}{row.raw.isMixed && row.raw.ledHalfProduct ? ` / ${row.raw.ledHalfProduct}` : ''}</p></div>
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Total Resolution</p><p className="text-xs font-black text-foreground tracking-tighter">{row.resolution} px</p></div>
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Aspect Ratio</p><p className="text-xs font-black text-foreground tracking-tighter">{row.aspect}</p></div>
                                </div>
                                <div className="pt-4 space-y-3"><p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2"><FileCode className="w-3 h-3" /> Designated Content Filename</p><div className="p-3 bg-muted/30 border border-border rounded-md text-[10px] text-muted-foreground break-all select-all hover:bg-muted/50 transition-colors">{row.id}_{row.name.replace(/\s+/g, '_')}_v1.mp4</div></div>
                            </div>
                            <div className="flex items-center justify-center bg-muted/20 rounded-lg border border-border p-8 min-h-[220px] relative">
                                <div className="mini-map-container transition-transform duration-300 group-hover:scale-[2.6] scale-[2.4]" data-screen-id={row.raw.id}><MiniPixelMap screen={row.raw} ledProducts={ledProducts} id={row.id} name={row.name} resolution={row.resolution} onDownload={() => downloadSingleMap(row.raw.id, row.id, row.name, row.resolution, row.raw.color || row.raw.borderColor || '#000000')} /></div>
                                <div className="absolute bottom-3 right-3 opacity-20 group-hover:opacity-100 transition-opacity"><LayoutGrid className="w-4 h-4 text-muted-foreground" /></div>
                            </div>
                        </div>
                    ))}</div>
                </section>
            )}
            {deliverables.showProjectionSection && projectionData.length > 0 && (
                <section className="space-y-8 pt-8">
                    <div className="flex items-center gap-4"><div className="h-8 w-1.5 bg-accent" /><h3 className="text-xl font-black uppercase tracking-widest text-foreground">{getNextSection()}. Screen Technical Breakdown (Projection)</h3></div>
                    <div className="space-y-12">{projectionData.map((row) => (
                        <div key={row.id} className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-card border border-border rounded-lg shadow-sm relative overflow-hidden group">
                            <div className="space-y-6"><div className="flex items-center gap-3"><span className="text-2xl font-black text-accent leading-none">{row.id}</span><h4 className="text-lg font-black uppercase text-foreground tracking-tight">{row.name}</h4></div>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Hardware Brand</p><p className="text-xs font-black text-foreground">{row.raw.manufacturer || 'Digital Projection'}</p></div>
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Product Name</p><p className="text-xs font-black text-foreground">{row.raw.product || 'N/A'}</p></div>
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Total Resolution</p><p className="text-xs font-black text-foreground tracking-tighter">{row.resolution} px</p></div>
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Aspect Ratio</p><p className="text-xs font-black text-foreground tracking-tighter">{row.aspect}</p></div>
                                </div>
                                <div className="pt-4 space-y-3"><p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2"><FileCode className="w-3 h-3" /> Designated Content Filename</p><div className="p-3 bg-muted/30 border border-border rounded-md text-[10px] text-muted-foreground break-all select-all hover:bg-muted/50 transition-colors">{row.id}_{row.name.replace(/\s+/g, '_')}_v1.mp4</div></div>
                            </div>
                            <div className="flex items-center justify-center bg-muted/20 rounded-lg border border-border p-8 min-h-[220px] relative">
                                <div className="mini-map-container transition-transform duration-300 group-hover:scale-[2.6] scale-[2.4]" data-screen-id={row.raw.id}><MiniProjectionMap id={row.id} name={row.name} resolution={row.resolution} color={row.color} onDownload={() => downloadSingleMap(row.raw.id, row.id, row.name, row.resolution, row.color)} /></div>
                                <div className="absolute bottom-3 right-3 opacity-20 group-hover:opacity-100 transition-opacity"><Monitor className="w-4 h-4 text-muted-foreground" /></div>
                            </div>
                        </div>
                    ))}</div>
                </section>
            )}
            <footer className="pt-16 pb-8 border-t border-border flex justify-between items-end opacity-40"><div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Digital Signature</p><p className="text-[10px] font-black">{signature}</p></div><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">End of Technical Specification</p></footer>
          </div>
        </div>
      </div>
    </div>
  );
}
