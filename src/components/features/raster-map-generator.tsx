
'use client';

import { useProjectContext, STRIP_GAP } from '@/contexts/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Monitor, Download, ZoomIn, ZoomOut, Expand, Ratio, FileArchive, Loader2, Save } from 'lucide-react';
import React, { useCallback, useState, useMemo, useRef } from 'react';
import { Button } from '../ui/button';
import { toPng } from 'html-to-image';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import JSZip from 'jszip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const resolutionPresets = {
  '1080p': { width: 1920, height: 1080 },
  '4K UHD': { width: 3840, height: 2160 },
  'DCI 4K': { width: 4096, height: 2160 },
};

const CleanRasterMap = ({ activeRaster, activeTileIndex, pixelMaps, ledProducts, finalWidth, finalHeight, numCols, numRows, canvasWidth, canvasHeight, useSmartPacking }: { activeRaster: any, activeTileIndex: number, pixelMaps: any[], ledProducts: any[], finalWidth: number, finalHeight: number, numCols: number, numRows: number, canvasWidth: number, canvasHeight: number, useSmartPacking: boolean }) => {
    
    const renderedScreens = useMemo(() => {
        if (!activeRaster) return [];
        return Object.keys(activeRaster.screenAssignments)
          .filter(screenId => activeRaster.screenAssignments[screenId])
          .map(screenId => {
              const screen = pixelMaps.find(p => p.id === screenId);
              const setting = activeRaster.screenSettings.find(s => s.screenId === screenId);

              if (!screen || !setting) return null;
              
              const halfProduct = screen.isMixed ? ledProducts.find(p => p.manufacturer === screen.ledManufacturer && p.name === screen.ledHalfProduct) : undefined;
              
              let screenWidthPx = screen.ledScreenWidth * screen.ledTileWidthPx;
              if (screen.isMixed && screen.ledScreenHalfWidth > 0) {
                screenWidthPx += (halfProduct ? halfProduct.width_px : screen.ledTileWidthPx / 2);
              }

              let screenHeightPx = screen.ledScreenHeight * screen.ledTileHeightPx;
              if (screen.isMixed && screen.ledScreenHalfHeight > 0) {
                screenHeightPx += (halfProduct ? halfProduct.height_px : screen.ledTileHeightPx / 2);
              }

              if (screenWidthPx <= 0 || screenHeightPx <= 0) return null;

              return { ...setting, ...screen, screenWidthPx, screenHeightPx, halfProduct };
          }).filter(Boolean);
    }, [activeRaster, pixelMaps, ledProducts]);

    const getTileLabel = (screen: any, row: number, col: number) => {
        if (!activeRaster?.showTileLabels || screen.tileNumbering === 'none') return null;
        const totalCols = screen.ledScreenWidth + (screen.isMixed && screen.ledScreenHalfWidth > 0 ? 1 : 0);
        let sequentialIndex = row * totalCols + col;
        switch (screen.tileNumbering) {
            case 'sequential': return (sequentialIndex + 1).toString();
            case 'col-row': return `${col + 1}-${row + 1}`;
            case 'row-col': return `${String.fromCharCode(65 + row)}${col + 1}`;
            default: return null;
        }
    };
    
    return (
        <div
            className="relative"
            style={{
                width: `${finalWidth}px`,
                height: `${finalHeight}px`,
                backgroundColor: activeRaster.backgroundColor,
            }}
        >
            {renderedScreens.map((screen) => {
                if (!screen) return null;

                const screenText = `${screen.name}\n${screen.screenWidthPx}x${screen.screenHeightPx}`;
                const totalRows = screen.ledScreenHeight + (screen.isMixed && screen.ledScreenHalfHeight > 0 ? 1 : 0);
                const totalCols = screen.ledScreenWidth + (screen.isMixed && screen.ledScreenHalfWidth > 0 ? 1 : 0);

                const screenContent = (
                    <div
                        className="absolute border border-dashed border-white/50"
                        style={{
                            left: `0px`, top: `0px`,
                            width: `${screen.screenWidthPx}px`, height: `${screen.screenHeightPx}px`,
                            backgroundColor: screen.borderColor, display: 'flex', flexDirection: 'column',
                            gap: `${screen.ledTileBorderPx}px`,
                        }}
                    >
                        {Array.from({ length: totalRows }).map((_, r) => {
                            const isHalfHeightRow = screen.isMixed && screen.ledScreenHalfHeight > 0 && r === 0;
                            const currentRowHeight = isHalfHeightRow ? (screen.halfProduct ? screen.halfProduct.height_px : screen.ledTileHeightPx / 2) : screen.ledTileHeightPx;
                            return (
                                <div key={r} className="flex" style={{ gap: `${screen.ledTileBorderPx}px`, height: `${currentRowHeight}px` }}>
                                    {Array.from({ length: totalCols }).map((_, c) => {
                                        const isEven = (r + c) % 2 === 0;
                                        let tileWidth = screen.ledTileWidthPx;
                                        if (screen.isMixed && screen.ledScreenHalfWidth > 0) {
                                            if (screen.halfPanelPosition === 'left' && c === 0) tileWidth = screen.halfProduct?.width_px || screen.ledTileWidthPx / 2;
                                            else if (screen.halfPanelPosition === 'right' && c === totalCols - 1) tileWidth = screen.halfProduct?.width_px || screen.ledTileWidthPx / 2;
                                        }
                                        return (
                                            <div key={c} style={{ backgroundColor: isEven ? screen.tileColor1 : screen.tileColor2, width: `${tileWidth}px`, height: '100%' }} className="relative flex items-center justify-center">
                                                {activeRaster.showTileLabels && <span className="font-bold" style={{ fontSize: `${screen.tileNumberSize}px`, color: screen.tileNumberColor, textShadow: '0 0 5px rgba(0,0,0,0.7)' }}>{getTileLabel(screen, r, c)}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                        {activeRaster.showScreenNames && (
                            <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                                <span style={{ fontSize: `${screen.nameFontSize}px`, textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }} className="text-white font-bold text-center break-words whitespace-pre-wrap">{screenText}</span>
                            </div>
                        )}
                    </div>
                );

                const processorWidth = canvasWidth;
                const processorHeight = canvasHeight;
                const screenResolutionX = screen.screenWidthPx;
                const screenResolutionY = screen.screenHeightPx;
                
                let packingMode: 'none' | 'vertical' | 'horizontal' = 'none';
                let strips = 1;

                if (useSmartPacking) {
                    const canFitNormally = screenResolutionX <= processorWidth && screenResolutionY <= processorHeight;

                    if (!canFitNormally) {
                        const stripsForWidth = Math.ceil(screenResolutionX / processorWidth);
                        const requiredHeightForWidthPacking = (stripsForWidth * screenResolutionY) + ((stripsForWidth - 1) * STRIP_GAP);
                        if (requiredHeightForWidthPacking <= processorHeight) {
                            packingMode = 'vertical';
                            strips = stripsForWidth;
                        } else {
                            const stripsForHeight = Math.ceil(screenResolutionY / processorHeight);
                            const requiredWidthForHeightPacking = (stripsForHeight * screenResolutionX) + ((stripsForHeight - 1) * STRIP_GAP);
                            if (requiredWidthForHeightPacking <= processorWidth) {
                                packingMode = 'horizontal';
                                strips = stripsForHeight;
                            }
                        }
                    }
                }

                if (packingMode === 'none') {
                    return (
                        <div key={screen.id} className="absolute" style={{ left: `${screen.positionX}px`, top: `${screen.positionY}px`}}>
                            {screenContent}
                            {activeRaster.showCoordinates && (
                                <div className="absolute top-0 left-0 bg-black/50 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-md pointer-events-none z-10" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.8)' }}>
                                    ({screen.positionX}x, {screen.positionY}y)
                                </div>
                            )}
                        </div>
                    );
                }
                
                return Array.from({ length: strips }).map((_, i) => {
                    let stripContainerStyle: React.CSSProperties = {};
                    let screenContentStyle: React.CSSProperties = {};
                    let stripPositionX = screen.positionX;
                    let stripPositionY = screen.positionY;
                    
                    if (packingMode === 'vertical') {
                        stripPositionY += i * (screen.screenHeightPx + STRIP_GAP);
                        stripContainerStyle = {
                            position: 'absolute',
                            left: `${screen.positionX}px`,
                            top: `${stripPositionY}px`,
                            width: `${processorWidth}px`,
                            height: `${screen.screenHeightPx}px`,
                            overflow: 'hidden',
                        };
                        screenContentStyle = {
                            position: 'absolute',
                            left: `-${i * processorWidth}px`,
                            top: '0px'
                        };
                    } else {
                        stripPositionX += i * (screen.screenWidthPx + STRIP_GAP);
                        stripContainerStyle = {
                            position: 'absolute',
                            left: `${stripPositionX}px`,
                            top: `${screen.positionY}px`,
                            width: `${screen.screenWidthPx}px`,
                            height: `${processorHeight}px`,
                            overflow: 'hidden',
                        };
                        screenContentStyle = {
                            position: 'absolute',
                            left: '0px',
                            top: `-${i * processorHeight}px`
                        };
                    }

                    return (
                        <div key={`${screen.id}-strip-${i}`} style={stripContainerStyle}>
                            <div style={screenContentStyle}>
                                {screenContent}
                            </div>
                            {activeRaster.showCoordinates && (
                                <div className="absolute top-0 left-0 bg-black/50 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-md pointer-events-none z-10" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.8)' }}>
                                    ({stripPositionX}x, {stripPositionY}y)
                                </div>
                            )}
                        </div>
                    );
                });
            })}

            {(numCols > 1 || numRows > 1) && (
                <div className="absolute inset-0 grid pointer-events-none z-50" style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)`, gridTemplateRows: `repeat(${numRows}, 1fr)` }}>
                    {Array.from({ length: numCols * numRows }).map((_, index) => {
                        const isActive = index === activeTileIndex;
                        return (
                            <div key={index} className={cn(
                                "box-border border-r-2 border-b-2 border-dashed relative transition-colors duration-300",
                                isActive ? "border-yellow-400 bg-yellow-400/10 shadow-[inset_0_0_40px_rgba(250,204,21,0.2)]" : "border-yellow-400/40"
                            )}>
                                <div className={cn(
                                    "absolute bottom-2 right-2 text-[10px] font-black uppercase tracking-[0.2em] transition-opacity",
                                    isActive ? "text-yellow-400 opacity-100" : "text-yellow-400/40 opacity-40"
                                )}>
                                    Raster {index + 1} {isActive ? '(ACTIVE)' : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};


export default function RasterMapGenerator() {
  const { getActiveRaster, getLayoutMetrics, setState, state, saveProject } = useProjectContext();
  const { pixelMaps, ledProducts, activeTileIndex, power: { useSmartPacking } } = state;
  const activeRaster = getActiveRaster();
  const { user } = useAuth();

  const mapRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isAnyPixelMapConfigured = pixelMaps.some(p => p.ledManufacturer && (p.ledProduct || p.ledManufacturer === 'Custom'));
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const MAX_PANELS_TO_RENDER = 3000;

  const isAnyScreenTooLarge = useMemo(() => {
      if (!activeRaster) return false;
      return Object.keys(activeRaster.screenAssignments).some(screenId => {
          if (!activeRaster.screenAssignments[screenId]) return false; 
          const screen = pixelMaps.find(p => p.id === screenId);
          if (!screen) return false;
          const totalPanels = (screen.ledScreenWidth + screen.ledScreenHalfWidth) * (screen.ledScreenHeight + screen.ledScreenHalfHeight);
          return totalPanels > MAX_PANELS_TO_RENDER;
      });
  }, [activeRaster, pixelMaps]);


  const { totalWidth, totalHeight, numCols, numRows, canvasWidth, canvasHeight } = useMemo(() => {
    if (!activeRaster) return { totalWidth: 0, totalHeight: 0, numCols: 1, numRows: 1, canvasWidth: 0, canvasHeight: 0 };
    return getLayoutMetrics(activeRaster);
  }, [activeRaster, state.pixelMaps, state.ledProducts, useSmartPacking]);

  const handleDownload = useCallback(async () => {
    if (mapRef.current === null || !activeRaster) {
        return;
    }

    setIsDownloading(true);
    toast({
        title: 'Preparing Download',
        description: 'Generating and zipping raster files... please wait.',
    });

    try {
        const zip = new JSZip();
        const rasterName = activeRaster.name.replace(/\s+/g, '_');
        const resolutionString = `${canvasWidth}x${canvasHeight}`;
        const zipFileName = `${rasterName}_${resolutionString}_Rasters.zip`;

        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                const translateX = -col * canvasWidth;
                const translateY = -row * canvasHeight;

                const dataUrl = await toPng(mapRef.current, {
                    cacheBust: true,
                    backgroundColor: activeRaster.backgroundColor,
                    pixelRatio: 1,
                    width: canvasWidth,
                    height: canvasHeight,
                    style: {
                       transform: `translateX(${translateX}px) translateY(${translateY}px)`,
                       width: `${numCols * canvasWidth}px`,
                       height: `${numRows * canvasHeight}px`,
                    }
                });
                
                const blob = await fetch(dataUrl).then(res => res.blob());
                const fileIndex = row * numCols + col + 1;
                zip.file(`${rasterName}_${resolutionString}_${fileIndex}.png`, blob);
            }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
            title: 'Download Successful',
            description: 'Your raster zip file has been downloaded.',
        });

    } catch (err) {
        console.error('Raster map download failed:', err);
        toast({
            variant: 'destructive',
            title: 'Download Failed',
            description: 'An error occurred while generating the raster files.',
        });
    } finally {
        setIsDownloading(false);
    }
  }, [activeRaster, numCols, numRows, canvasWidth, canvasHeight, toast]);

  const handleRasterChange = <K extends keyof NonNullable<typeof activeRaster>>(key: K, value: NonNullable<typeof activeRaster>[K]) => {
      setState((prevState) => {
          const newRasters = [...prevState.rasters];
          const currentRaster = newRasters[prevState.activeRasterIndex];
          if (currentRaster) {
              newRasters[prevState.activeRasterIndex] = { ...currentRaster, [key]: value };
          }
          return { ...prevState, rasters: newRasters };
      });
  };

  const handleZoom = (direction: 'in' | 'out') => {
      if (!activeRaster) return;
      const currentZoom = activeRaster.zoom || 1;
      const newZoom = direction === 'in'
          ? Math.min(currentZoom * 1.2, 5)
          : Math.max(currentZoom / 1.2, 0.2);
      handleRasterChange('zoom', newZoom);
  }

  const setZoom = (newZoom: number) => {
      if (!activeRaster) return;
      handleRasterChange('zoom', newZoom);
  };

  const fitToScreen = () => {
    if (!mapRef.current || !scrollAreaRef.current) return;

    const mapWidth = mapRef.current.scrollWidth;
    const mapHeight = mapRef.current.scrollHeight;
    const scrollAreaWidth = scrollAreaRef.current.clientWidth - 32;
    const scrollAreaHeight = scrollAreaRef.current.clientHeight - 32;

    if (mapWidth > 0 && mapHeight > 0) {
        const scaleX = scrollAreaWidth / mapWidth;
        const scaleY = scrollAreaHeight / mapHeight;
        setZoom(Math.min(scaleX, scaleY, 1));
    }
  };
  
  const isMultiRaster = numCols > 1 || numRows > 1;
  const finalWidth = numCols * canvasWidth;
  const finalHeight = numRows * canvasHeight;

  if (!isAnyPixelMapConfigured) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Raster Map Planner</CardTitle>
                <CardDescription>Visual output configuration for your screen canvas.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Monitor className="h-4 w-4" />
                    <AlertTitle>Hardware Configuration Required</AlertTitle>
                    <AlertDescription>
                        Please select an LED Manufacturer and Product from the sidebar to visualize the raster map.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }

  if (!activeRaster) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Raster Map Planner</CardTitle>
                <CardDescription>Visual output configuration for your screen canvas.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Raster Layout Selected</AlertTitle>
                    <AlertDescription>
                        Please create or select a raster layout from the sidebar to visualize the canvas.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }

  return (
    <>
      <Card>
          <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col">
                      <CardTitle>Raster Map Preview</CardTitle>
                      <CardDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">
                      A visual representation of your processor's output canvas with all screens positioned.
                      </CardDescription>
                  </div>

                  {isAnyPixelMapConfigured && !isAnyScreenTooLarge && (
                    <div className="flex-1 flex justify-center gap-4">
                        <div className="bg-muted/30 border border-white/5 px-4 py-2 rounded-xl shadow-inner flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Active Layout</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-black text-white leading-none">{totalWidth}</span>
                                <span className="text-blue-500 font-black text-sm">×</span>
                                <span className="text-lg font-black text-white leading-none">{totalHeight}</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase ml-2">PX</span>
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
                      <Button variant="outline" size="icon" onClick={() => handleZoom('in')} disabled={!isAnyPixelMapConfigured || isAnyScreenTooLarge}>
                          <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleZoom('out')} disabled={!isAnyPixelMapConfigured || isAnyScreenTooLarge}>
                          <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={fitToScreen} disabled={!isAnyPixelMapConfigured || isAnyScreenTooLarge}>
                          <Expand className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setZoom(1)} disabled={!isAnyPixelMapConfigured || isAnyScreenTooLarge}>
                          <Ratio className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleDownload} disabled={!isAnyPixelMapConfigured || isDownloading || isAnyScreenTooLarge} className="font-bold uppercase text-[10px] tracking-widest">
                          {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isMultiRaster ? <FileArchive className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />)}
                          {isMultiRaster ? 'Download Rasters as .zip' : 'Download PNG'}
                      </Button>
                  </div>
              </div>
          </CardHeader>
      </Card>
      <Card>
        <CardContent className="p-0">
            { isAnyScreenTooLarge ? (
                <div className="p-6">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Preview Too Large</AlertTitle>
                    <AlertDescription>
                        One or more screens assigned to this raster exceed the rendering limit ({MAX_PANELS_TO_RENDER.toLocaleString()} panels). Technical maps are disabled.
                    </AlertDescription>
                  </Alert>
                </div>
            ) : (
                <ScrollArea ref={scrollAreaRef} className="w-full whitespace-nowrap">
                  <div className="w-full bg-muted/30 rounded-md flex items-start justify-start p-8">
                      <div
                          className="relative inline-block transition-transform duration-200 origin-top-left"
                          style={{ transform: `scale(${activeRaster.zoom || 1})` }}
                      >
                          <div ref={mapRef}>
                            <CleanRasterMap 
                                activeRaster={activeRaster}
                                activeTileIndex={activeTileIndex}
                                pixelMaps={pixelMaps}
                                ledProducts={ledProducts}
                                finalWidth={finalWidth}
                                finalHeight={finalHeight}
                                numCols={numCols}
                                numRows={numRows}
                                canvasWidth={canvasWidth}
                                canvasHeight={canvasHeight}
                                useSmartPacking={useSmartPacking}
                            />
                          </div>
                      </div>
                  </div>
                    <ScrollBar orientation="vertical" />
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
            )}
        </CardContent>
      </Card>
    </>
  );
}
