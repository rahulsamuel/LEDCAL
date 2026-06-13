
'use client';

import { useProjectContext, PixelMapState } from '@/contexts/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Download, ZoomIn, ZoomOut, Expand, Ratio, Save } from 'lucide-react';
import React, { useRef, useCallback, useState, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { Button } from '../ui/button';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';

const Tile = ({
  width,
  height,
  color,
  label,
  labelSize,
  labelColor,
}: {
  width: number;
  height: number;
  color: string;
  label: string | null;
  labelSize: number;
  labelColor: string;
}) => (
  <div
    style={{
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: color,
    }}
    className="relative flex items-center justify-center"
  >
    {label !== null && (
      <span
        className="font-bold"
        style={{
          fontSize: `${labelSize}px`,
          color: labelColor,
          textShadow: '0 0 5px rgba(0,0,0,0.7)',
        }}
      >
        {label}
      </span>
    )}
  </div>
);

const CleanPixelMap = ({ settings, state }: { settings: PixelMapState, state: any }) => {
    const {
        ledScreenWidth, ledScreenHeight, isMixed, ledScreenHalfWidth, ledScreenHalfHeight,
        ledHalfProduct, ledTileWidthPx, ledTileHeightPx, ledTileBorderPx, borderColor,
        tileColor1, tileColor2, overlayTexts, showScalingOverlay, tileNumbering,
        tileNumberSize, tileNumberColor, halfPanelPosition
    } = settings;

    const halfProductData = isMixed ? state.ledProducts.find((p: any) => p.manufacturer === settings.ledManufacturer && p.name === ledHalfProduct) : undefined;
    
    let totalWidthPx = ledScreenWidth * ledTileWidthPx;
    if (isMixed && ledScreenHalfWidth > 0) {
        totalWidthPx += (halfProductData ? halfProductData.width_px : ledTileWidthPx / 2);
    }
    
    let totalHeightPx = ledScreenHeight * ledTileHeightPx;
    if (isMixed && ledScreenHalfHeight > 0) {
        totalHeightPx += (halfProductData ? halfProductData.height_px : ledTileHeightPx / 2);
    }

    const numRows = ledScreenHeight + (isMixed && ledScreenHalfHeight > 0 ? 1 : 0);
    const numCols = ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0);

    const getProcessedText = (text: string) => {
        return text
            .replace('{width}', totalWidthPx.toString())
            .replace('{height}', totalHeightPx.toString())
            .replace('{name}', settings.name);
    };

    const getTileLabel = (row: number, col: number) => {
        if (tileNumbering === 'none') return null;
        switch (tileNumbering) {
            case 'sequential': return (row * numCols + col + 1).toString();
            case 'col-row': return `${col + 1}-${row + 1}`;
            case 'row-col': return `${String.fromCharCode(65 + row)}${col + 1}`;
            default: return null;
        }
    };

    return (
        <div
            className="relative flex"
            style={{
                width: `${totalWidthPx}px`,
                height: `${totalHeightPx}px`,
                backgroundColor: borderColor,
                gap: `${ledTileBorderPx}px`,
                flexDirection: 'column',
            }}
        >
            {Array.from({ length: numRows }).map((_, r) => {
                const isHalfHeightRow = isMixed && ledScreenHalfHeight > 0 && r === 0;
                const currentRowHeight = isHalfHeightRow ? (halfProductData ? halfProductData.height_px : ledTileHeightPx / 2) : ledTileHeightPx;

                return (
                    <div key={r} className="flex" style={{ gap: `${ledTileBorderPx}px`, height: `${currentRowHeight}px` }}>
                        {isMixed && ledScreenHalfWidth > 0 && halfPanelPosition === 'left' && (
                            <Tile
                                width={halfProductData ? halfProductData.width_px : ledTileWidthPx / 2}
                                height={currentRowHeight}
                                color={(r + 0) % 2 === 0 ? tileColor1 : tileColor2}
                                label={getTileLabel(r, 0)}
                                labelSize={tileNumberSize}
                                labelColor={tileNumberColor}
                            />
                        )}
                        {Array.from({ length: ledScreenWidth }).map((_, c) => {
                            const colIndex = (isMixed && ledScreenHalfWidth > 0 && halfPanelPosition === 'left') ? c + 1 : c;
                            const isEven = (r + colIndex) % 2 === 0;
                            return (
                                <Tile
                                    key={c}
                                    width={ledTileWidthPx}
                                    height={currentRowHeight}
                                    color={isEven ? tileColor1 : tileColor2}
                                    label={getTileLabel(r, colIndex)}
                                    labelSize={tileNumberSize}
                                    labelColor={tileNumberColor}
                                />
                            );
                        })}
                        {isMixed && ledScreenHalfWidth > 0 && halfPanelPosition === 'right' && (
                            <Tile
                                width={halfProductData ? halfProductData.width_px : ledTileWidthPx / 2}
                                height={currentRowHeight}
                                color={(r + ledScreenWidth) % 2 === 0 ? tileColor1 : tileColor2}
                                label={getTileLabel(r, ledScreenWidth)}
                                labelSize={tileNumberSize}
                                labelColor={tileNumberColor}
                            />
                        )}
                    </div>
                );
            })}

            {showScalingOverlay && (
                <div className="absolute inset-0 pointer-events-none">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <line x1="0" y1="0" x2={totalWidthPx} y2={totalHeightPx} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" />
                        <line x1={totalWidthPx} y1="0" x2="0" y2={totalHeightPx} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" />
                        <circle cx={totalWidthPx / 2} cy={totalHeightPx / 2} r={Math.min(totalWidthPx, totalHeightPx) / 2} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" fill="none" />
                    </svg>
                </div>
            )}
            {overlayTexts.map((ot) => (
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


export default function PixelMapGenerator() {
  const { getActiveScreen, setState, state, saveProject } = useProjectContext();
  const settings = getActiveScreen();
  const { user } = useAuth();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const [draggingItem, setDraggingItem] = useState<{type: 'text', id: number, offset: {x: number, y: number}} | null>(null);

  const handlePixelMapChange = <K extends keyof NonNullable<typeof settings>>(key: K, value: NonNullable<typeof settings>[K]) => {
      setState(prevState => {
        const newPixelMaps = [...prevState.pixelMaps];
        const activeScreen = newPixelMaps[prevState.activeScreenIndex];
        if (activeScreen) {
          newPixelMaps[prevState.activeScreenIndex] = { ...activeScreen, [key]: value };
        }
        return { ...prevState, pixelMaps: newPixelMaps };
      });
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: 'text', id: number) => {
    const target = e.target as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offset = {
      x: e.clientX - centerX,
      y: e.clientY - centerY,
    };
    setDraggingItem({ type, id, offset });
    e.dataTransfer.setData('text/plain', '');
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggingItem || !mapRef.current) return;

    const mapRect = mapRef.current.getBoundingClientRect();
    const newX = e.clientX - mapRect.left - draggingItem.offset.x;
    const newY = e.clientY - mapRect.top - draggingItem.offset.y;

    if (draggingItem.type === 'text' && draggingItem.id !== undefined) {
      const newOverlayTexts = settings!.overlayTexts.map(ot => 
        ot.id === draggingItem.id ? { ...ot, position: { x: newX, y: newY } } : ot
      );
      handlePixelMapChange('overlayTexts', newOverlayTexts);
    }
    
    setDraggingItem(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const isProductSelected = !!(settings?.ledManufacturer && (settings?.ledProduct || settings?.ledManufacturer === 'Custom'));

  const handleDownload = useCallback(() => {
    if (mapRef.current === null || !settings) {
      return
    }

    const { ledScreenWidth, ledTileWidthPx, ledScreenHalfWidth, ledScreenHeight, ledTileHeightPx, ledScreenHalfHeight } = settings;
    const halfProductData = settings.isMixed ? state.ledProducts.find(p => p.manufacturer === settings.ledManufacturer && p.name === settings.ledHalfProduct) : undefined;
    
    let totalWidthPx = ledScreenWidth * ledTileWidthPx;
    if (ledScreenHalfWidth > 0) {
        totalWidthPx += (halfProductData ? halfProductData.width_px : ledTileWidthPx / 2);
    }

    let totalHeightPx = ledScreenHeight * ledTileHeightPx;
    if (ledScreenHalfHeight > 0) {
        totalHeightPx += (halfProductData ? halfProductData.height_px : ledTileHeightPx / 2);
    }

    const screenName = settings.name.replace(/\s+/g, '_');
    const fileName = `PIXEL_MAP_${screenName}_${totalWidthPx}x${totalHeightPx}.png`;

    toPng(mapRef.current, { 
        cacheBust: true, 
        backgroundColor: '#1E3A8A',
        pixelRatio: 1,
    })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = fileName;
        link.href = dataUrl
        link.click()
      })
      .catch((err) => {
        console.error('oops, something went wrong!', err)
      })
  }, [mapRef, settings, state.ledProducts]);

  const handleZoom = (direction: 'in' | 'out') => {
    setState(prevState => {
        const activeScreen = prevState.pixelMaps[prevState.activeScreenIndex];
        if (!activeScreen) return prevState;
        const currentZoom = activeScreen.zoom;
        const newZoom = direction === 'in' 
            ? Math.min(currentZoom * 1.2, 5)
            : Math.max(currentZoom / 1.2, 0.2);
        
        const newPixelMaps = [...prevState.pixelMaps];
        newPixelMaps[prevState.activeScreenIndex] = {
            ...activeScreen,
            zoom: newZoom
        };

        return {
            ...prevState,
            pixelMaps: newPixelMaps
        }
    })
  }

  const setZoom = (newZoom: number) => {
    setState(prevState => {
      const newPixelMaps = [...prevState.pixelMaps];
      const activeScreen = newPixelMaps[prevState.activeScreenIndex];
      if (activeScreen) {
        newPixelMaps[prevState.activeScreenIndex] = {
          ...activeScreen,
          zoom: newZoom,
        };
      }
      return { ...prevState, pixelMaps: newPixelMaps };
    });
  };

  const fitToScreen = () => {
    if (!mapRef.current || !scrollAreaRef.current) return;

    const mapWidth = mapRef.current.offsetWidth;
    const mapHeight = mapRef.current.offsetHeight;
    const scrollAreaWidth = scrollAreaRef.current.clientWidth - 32;
    const scrollAreaHeight = scrollAreaRef.current.clientHeight - 32;

    if (mapWidth > 0 && mapHeight > 0) {
      const scaleX = scrollAreaWidth / mapWidth;
      const scaleY = scrollAreaHeight / mapHeight;
      setZoom(Math.min(scaleX, scaleY, 1));
    }
  };

  const totalResolution = useMemo(() => {
    if (!settings) return { w: 0, h: 0 };
    const { ledScreenWidth, ledTileWidthPx, ledScreenHalfWidth, ledScreenHeight, ledTileHeightPx, ledScreenHalfHeight } = settings;
    const halfProductData = settings.isMixed ? state.ledProducts.find(p => p.manufacturer === settings.ledManufacturer && p.name === settings.ledHalfProduct) : undefined;
    
    let w = ledScreenWidth * ledTileWidthPx;
    if (ledScreenHalfWidth > 0) w += (halfProductData ? halfProductData.width_px : ledTileWidthPx / 2);

    let h = ledScreenHeight * ledTileHeightPx;
    if (ledScreenHalfHeight > 0) h += (halfProductData ? halfProductData.height_px : ledTileHeightPx / 2);
    
    return { w, h };
  }, [settings, state.ledProducts]);

  if (!settings) {
    return (
       <Card>
        <CardContent className="p-6 flex items-center justify-center">
             <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Screen Selected</AlertTitle>
                <AlertDescription>
                    Please create or select a screen from the sidebar.
                </AlertDescription>
            </Alert>
        </CardContent>
       </Card>
    )
  }

  const {
    ledScreenWidth, ledScreenHeight, isMixed, ledScreenHalfWidth, ledScreenHalfHeight,
    ledHalfProduct, ledTileWidthPx, ledTileHeightPx, zoom, overlayTexts
  } = settings;

  const totalPanels = (ledScreenWidth + ledScreenHalfWidth) * (ledScreenHeight + ledScreenHalfHeight);
  const MAX_PANELS_TO_RENDER = 3000;
  const shouldRender = totalPanels > 0 && totalPanels <= MAX_PANELS_TO_RENDER;


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold tracking-tight">Pixel Map Preview</CardTitle>
                {settings.isMixed && (
                    <Badge variant="default" className="font-black uppercase text-[9px] h-5 px-2">
                        (MIXED)
                    </Badge>
                )}
              </div>
              <CardDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">
                A visual representation of your LED screen's layout.
              </CardDescription>
            </div>

            {isProductSelected && shouldRender && (
                <div className="flex-1 flex justify-center">
                    <div className="bg-muted/30 border border-white/5 px-6 py-2 rounded-xl shadow-inner flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Active Resolution</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-white leading-none">{totalResolution.w}</span>
                            <span className="text-orange-500 font-black text-lg">×</span>
                            <span className="text-xl font-black text-white leading-none">{totalResolution.h}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">Pixels</span>
                        </div>
                    </div>
                </div>
            )}

            <div className='flex items-center gap-2'>
              {user && (
                <Button onClick={saveProject} className="font-bold uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Save className="mr-2 h-4 w-4" />
                  {state.activeProjectId ? 'Update Cloud' : 'Save to Cloud'}
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => handleZoom('in')} disabled={!isProductSelected || !shouldRender}>
                  <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleZoom('out')} disabled={!isProductSelected || !shouldRender}>
                  <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={fitToScreen} disabled={!isProductSelected || !shouldRender}>
                  <Expand className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setZoom(1)} disabled={!isProductSelected || !shouldRender}>
                  <Ratio className="h-4 w-4" />
              </Button>
              <Button onClick={handleDownload} disabled={!isProductSelected || !shouldRender} className="font-bold uppercase text-[10px] tracking-widest bg-blue-600 hover:bg-blue-700">
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="p-0">
          {!isProductSelected ? (
              <div className="p-6">
                  <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No Product Selected</AlertTitle>
                      <AlertDescription>
                          Please select an LED Manufacturer and Product from the sidebar to view the pixel map.
                      </AlertDescription>
                  </Alert>
              </div>
          ) : shouldRender ? (
            <ScrollArea ref={scrollAreaRef} className="w-full whitespace-nowrap">
              <div className="w-full h-full bg-[#182339] p-4 flex items-start justify-start">
                <div
                  className="relative inline-block transition-transform duration-200 origin-top-left"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <div
                    ref={mapRef}
                    className="relative"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                     <CleanPixelMap settings={settings} state={state} />
                     {overlayTexts.map((ot) => (
                        <div
                          key={ot.id}
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, 'text', ot.id)}
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
                              cursor: 'move',
                              whiteSpace: 'pre-wrap',
                          }}
                        >
                            {ot.text
                                .replace('{width}', totalResolution.w.toString())
                                .replace('{height}', totalResolution.h.toString())
                                .replace('{name}', settings.name)}
                        </div>
                    ))}
                  </div>
                </div>
              </div>
              <ScrollBar orientation="vertical" />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="p-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Preview Too Large</AlertTitle>
                <AlertDescription>
                    The panel grid is too large to render a preview ({totalPanels.toLocaleString()} panels). Maximum is {MAX_PANELS_TO_RENDER}.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
