'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Zap, Download, ZoomIn, ZoomOut, Expand, Ratio, GitBranch, Monitor } from 'lucide-react';
import React, { useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Button } from '../ui/button';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { WiringPattern } from '@/contexts/project-context';
import { Badge } from '@/components/ui/badge';


const getPanelSequence = (width: number, height: number, pattern: WiringPattern, isMixed: boolean = false, halfHeight: number = 0, halfWidth: number = 0, halfPanelPosition: 'left' | 'right' = 'right') => {
    const sequence: { row: number, col: number, isHalf: boolean }[] = [];
    const totalHeight = height + halfHeight;
    const totalWidth = width + halfWidth;

    const addPanel = (r: number, c: number) => {
        const isHalfRow = isMixed && halfHeight > 0 && r === 0;
        const isHalfCol = isMixed && halfWidth > 0 && (halfPanelPosition === 'left' ? c < halfWidth : c >= width);
        sequence.push({ row: r, col: c, isHalf: isHalfRow || isHalfCol });
    };

    switch (pattern) {
        case 'left-to-right':
            for (let r = 0; r < totalHeight; r++) for (let c = 0; c < totalWidth; c++) addPanel(r, c);
            break;
        case 'right-to-left':
            for (let r = 0; r < totalHeight; r++) for (let c = totalWidth - 1; c >= 0; c--) addPanel(r, c);
            break;
        case 'top-to-bottom':
            for (let c = 0; c < totalWidth; c++) for (let r = 0; r < totalHeight; r++) addPanel(r, c);
            break;
        case 'bottom-to-top':
            for (let c = 0; c < totalWidth; c++) for (let r = totalHeight - 1; r >= 0; r--) addPanel(r, c);
            break;
        case 'serpentine-lr':
            for (let r = 0; r < totalHeight; r++) {
                if (r % 2 === 0) for (let c = 0; c < totalWidth; c++) addPanel(r, c);
                else for (let c = totalWidth - 1; c >= 0; c--) addPanel(r, c);
            }
            break;
        case 'serpentine-rl':
            for (let r = 0; r < totalHeight; r++) {
                if (r % 2 === 0) for (let c = totalWidth - 1; c >= 0; c--) addPanel(r, c);
                else for (let c = 0; c < totalWidth; c++) addPanel(r, c);
            }
            break;
        case 'serpentine-tb-lr':
            for (let c = 0; c < totalWidth; c++) {
                if (c % 2 === 0) for (let r = 0; r < totalHeight; r++) addPanel(r, c);
                else for (let r = totalHeight - 1; r >= 0; r--) addPanel(r, c);
            }
            break;
        case 'serpentine-tb-rl':
            for (let c = totalWidth - 1; c >= 0; c--) {
                if ((totalWidth - 1 - c) % 2 === 0) for (let r = 0; r < totalHeight; r++) addPanel(r, c);
                else for (let r = totalHeight - 1; r >= 0; r--) addPanel(r, c);
            }
            break;
        default:
            for (let r = 0; r < totalHeight; r++) for (let c = 0; c < totalWidth; c++) addPanel(r, c);
            break;
    }
    return sequence;
};


const Arrow = ({ from, to, color }: { from: {x:number, y:number}, to: {x:number, y:number}, color: string }) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
    const length = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));

    return (
        <div 
            className="absolute z-20 pointer-events-none"
            style={{
                left: `${from.x}px`,
                top: `${from.y}px`,
                width: `${length}px`,
                transformOrigin: 'left center',
                transform: `rotate(${angle}deg)`,
            }}
        >
            <svg width={length} height="14" viewBox={`0 0 ${length} 14`} className="overflow-visible">
                <line x1="0" y1="7" x2={length - 10} y2="7" stroke={color} strokeWidth="3" strokeDasharray="4 2" />
                <polygon points={`${length-10},2 ${length},7 ${length-10},12`} fill={color} />
            </svg>
        </div>
    );
};

export default function WiringDiagram() {
    const { getActiveScreen, state, powerAndDataCalculations, setState } = useProjectContext();
    const activeScreen = getActiveScreen();
    
    const mapRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const isScreenConfigured = !!(activeScreen?.ledManufacturer && (activeScreen?.ledProduct || activeScreen?.ledManufacturer === 'Custom'));

    const handleDownload = useCallback(() => {
        if (mapRef.current === null || !activeScreen) {
          return
        }

        const totalHeightInTiles = activeScreen.ledScreenHeight + (activeScreen.isMixed ? 0.5 : 0) * activeScreen.ledScreenHalfHeight;
        const wiringType = activeScreen.wiringMode.charAt(0).toUpperCase() + activeScreen.wiringMode.slice(1);
        const fileName = `WIRING_DIAGRAM_${wiringType}_${activeScreen.name.replace(/\s+/g, '_')}_${activeScreen.ledScreenWidth}x${totalHeightInTiles}.png`;
    
        toPng(mapRef.current, { 
            cacheBust: true, 
            backgroundColor: '#111827', 
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
      }, [activeScreen]);

    const handleZoom = (direction: 'in' | 'out') => {
        const currentZoom = state.wiringDiagramZoom;
        const newZoom = direction === 'in' 
            ? Math.min(currentZoom * 1.2, 5)
            : Math.max(currentZoom / 1.2, 0.2);
        setState(prevState => ({ ...prevState, wiringDiagramZoom: newZoom }));
    }

    const setZoom = (newZoom: number) => {
        setState(prevState => ({ ...prevState, wiringDiagramZoom: newZoom }));
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

    if (!isScreenConfigured) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Wiring Diagram</CardTitle>
                    <CardDescription>Visualize the signal and power flow for your hardware setup.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Monitor className="h-4 w-4" />
                        <AlertTitle>No Screen Configured</AlertTitle>
                        <AlertDescription>
                            Please select an LED Manufacturer and Product from the sidebar to view the wiring diagram.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    if (!activeScreen) return null;

    const {
        ledScreenWidth,
        ledScreenHeight,
        isMixed,
        ledScreenHalfWidth,
        ledScreenHalfHeight,
        ledTileWidthPx,
        ledTileHeightPx,
        wiringMode,
        wiringPattern,
        powerWiringPattern,
        tileNumbering,
        tileColor1,
        tileColor2,
        tileNumberSize,
        tileNumberColor,
        halfPanelPosition,
        ledHalfProduct,
        ledTileBorderPx,
        borderColor,
    } = activeScreen;

    const { panelsPerPort, panelsPer20A_Circuit } = powerAndDataCalculations;
    const halfProductData = isMixed ? state.ledProducts.find(p => p.manufacturer === activeScreen.ledManufacturer && p.name === ledHalfProduct) : undefined;

    const totalPanels = (ledScreenWidth + ledScreenHalfWidth) * (ledScreenHeight + ledScreenHalfHeight);
    const MAX_PANELS_TO_RENDER = 3000;
    const shouldRender = totalPanels > 0 && totalPanels <= MAX_PANELS_TO_RENDER;
  
    const currentPattern = wiringMode === 'data' ? wiringPattern : powerWiringPattern;
    const panelSequence = getPanelSequence(ledScreenWidth, ledScreenHeight, currentPattern, isMixed, ledScreenHalfHeight, ledScreenHalfWidth, halfPanelPosition);
    const panelsPerChunk = wiringMode === 'data' ? panelsPerPort : panelsPer20A_Circuit;
  
    const panelPositions: { [key: string]: { x: number, y: number, cx: number, cy: number, tx: number, ty: number, bx: number, by: number, lx: number, ly: number, rx: number, ry: number } } = {};
    
    const BASE_TILE_SIZE = 120;
    const TILE_GAP = 0; 
    
    const aspectRatio = (ledTileWidthPx > 0 && ledTileHeightPx > 0) ? ledTileWidthPx / ledTileHeightPx : 1;
    const TILE_WIDTH = aspectRatio >= 1 ? BASE_TILE_SIZE : BASE_TILE_SIZE * aspectRatio;
    const TILE_HEIGHT = aspectRatio < 1 ? BASE_TILE_SIZE : BASE_TILE_SIZE / aspectRatio;
    
    let HALF_WIDTH_TILE_WIDTH = TILE_WIDTH / 2;
    if (halfProductData && ledTileWidthPx > 0) {
        HALF_WIDTH_TILE_WIDTH = (halfProductData.width_px / ledTileWidthPx) * TILE_WIDTH;
    }
    let HALF_HEIGHT_TILE_HEIGHT = TILE_HEIGHT / 2;
    if (halfProductData && ledTileHeightPx > 0) {
        HALF_HEIGHT_TILE_HEIGHT = (halfProductData.height_px / ledTileHeightPx) * TILE_HEIGHT;
    }
  
    const ARROW_COLOR = wiringMode === 'data' ? '#22c55e' : '#ef4444';
  
    const portChunks: { row: number, col: number, isHalf: boolean }[][] = [];
    if (panelsPerChunk > 0) {
        for (let i = 0; i < panelSequence.length; i += panelsPerChunk) {
            portChunks.push(panelSequence.slice(i, i + panelsPerChunk));
        }
    }
  
    const totalCols = ledScreenWidth + ledScreenHalfWidth;
    const totalRows = ledScreenHeight + ledScreenHalfHeight;

    Array.from({ length: totalRows }).forEach((_, r) => {
        const isHalfH = isMixed && ledScreenHalfHeight > 0 && r === 0;
        const currentTileHeight = isHalfH ? HALF_HEIGHT_TILE_HEIGHT : TILE_HEIGHT;

        let y = 0;
        for(let i=0; i<r; i++) {
            const prevIsHalfH = isMixed && ledScreenHalfHeight > 0 && i === 0;
            y += (prevIsHalfH ? HALF_HEIGHT_TILE_HEIGHT : TILE_HEIGHT) + TILE_GAP;
        }

        Array.from({ length: totalCols }).forEach((_, c) => {
            let isHalfW = false;
            if(isMixed && ledScreenHalfWidth > 0) {
                if(halfPanelPosition === 'left') isHalfW = c < ledScreenHalfWidth;
                else isHalfW = c >= ledScreenWidth;
            }
            const currentTileWidth = isHalfW ? HALF_WIDTH_TILE_WIDTH : TILE_WIDTH;

            let x = 0;
            for(let i=0; i<c; i++) {
                let w = TILE_WIDTH;
                if(isMixed && ledScreenHalfWidth > 0) {
                    if(halfPanelPosition === 'left') w = i < ledScreenHalfWidth ? HALF_WIDTH_TILE_WIDTH : TILE_WIDTH;
                    else w = i >= ledScreenWidth ? HALF_WIDTH_TILE_WIDTH : TILE_WIDTH;
                }
                x += w + TILE_GAP;
            }
            
            const key = `${r}-${c}`;
            panelPositions[key] = {
                x, y,
                cx: x + currentTileWidth / 2, cy: y + currentTileHeight / 2,
                tx: x + currentTileWidth / 2, ty: y, bx: x + currentTileWidth / 2, by: y + currentTileHeight,
                lx: x, ly: y + currentTileHeight / 2, rx: x + currentTileWidth, ry: y + currentTileHeight / 2
            };
        });
    });

    const mapWidth = (ledScreenWidth * TILE_WIDTH) + (ledScreenHalfWidth * HALF_WIDTH_TILE_WIDTH);
    const mapHeight = (ledScreenHeight * TILE_HEIGHT) + (ledScreenHalfHeight * HALF_HEIGHT_TILE_HEIGHT);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <CardTitle>Wiring Diagram Preview</CardTitle>
                            {activeScreen.isMixed && (
                                <Badge variant="default" className="font-black uppercase text-[9px] h-5 px-2">
                                    (MIXED)
                                </Badge>
                            )}
                        </div>
                        <div className='flex items-center gap-2'>
                            <Button variant="outline" size="icon" onClick={() => handleZoom('in')} disabled={!isScreenConfigured || !shouldRender}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleZoom('out')} disabled={!isScreenConfigured || !shouldRender}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={fitToScreen} disabled={!isScreenConfigured || !shouldRender}>
                                <Expand className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setZoom(1)} disabled={!isScreenConfigured || !shouldRender}>
                                <Ratio className="h-4 w-4" />
                            </Button>
                            <Button onClick={handleDownload} disabled={!isScreenConfigured || !shouldRender} className="font-bold uppercase text-[10px] tracking-widest">
                                <Download className="mr-2 h-4 w-4" />
                                Download PNG
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>
             <Card>
                <CardContent className="p-0">
                    {shouldRender ? (
                        <ScrollArea ref={scrollAreaRef} className="w-full whitespace-nowrap">
                            <div className="w-full bg-muted/30 p-8 rounded-md flex items-start justify-start">
                                <div 
                                    className="relative inline-block transition-transform duration-200 origin-top-left"
                                    style={{ transform: `scale(${state.wiringDiagramZoom})` }}
                                >
                                    <div
                                        ref={mapRef}
                                        className="relative"
                                        style={{
                                            width: mapWidth,
                                            height: mapHeight,
                                            backgroundColor: borderColor,
                                        }}
                                    >
                                        {Array.from({ length: totalRows }).map((_, r) => {
                                            const isHalfH = isMixed && ledScreenHalfHeight > 0 && r === 0;
                                            const currentTileHeight = isHalfH ? HALF_HEIGHT_TILE_HEIGHT : TILE_HEIGHT;
                                            
                                            return (
                                                <div key={`row-${r}`} className="flex" style={{ height: currentTileHeight }}>
                                                    {Array.from({ length: totalCols }).map((_, c) => {
                                                        let isHalfW = false;
                                                        if(isMixed && ledScreenHalfWidth > 0) {
                                                            if(halfPanelPosition === 'left') isHalfW = c < ledScreenHalfWidth;
                                                            else isHalfW = c >= ledScreenWidth;
                                                        }
                                                        
                                                        const currentTileWidth = isHalfW ? HALF_WIDTH_TILE_WIDTH : TILE_WIDTH;
                                                        const isEven = (r + c) % 2 === 0;
                                                        const sequenceIndex = panelSequence.findIndex(p => p.row === r && p.col === c);
                                                        
                                                        let tileLabel: string | null = null;
                                                        if (tileNumbering !== 'none' && sequenceIndex !== -1) {
                                                            if (tileNumbering === 'sequential') tileLabel = (sequenceIndex + 1).toString();
                                                            else if (tileNumbering === 'col-row') tileLabel = `${c + 1}-${r + 1}`;
                                                            else if (tileNumbering === 'row-col') tileLabel = `${String.fromCharCode(65 + r)}${c + 1}`;
                                                        }

                                                        const portIndex = Math.floor(sequenceIndex / panelsPerChunk);
                                                        const isPortStart = sequenceIndex % panelsPerChunk === 0;

                                                        return (
                                                            <div 
                                                                key={`${r}-${c}`} 
                                                                className="flex items-center justify-center border-border/20 border relative shrink-0" 
                                                                style={{ 
                                                                    width: currentTileWidth, 
                                                                    height: '100%',
                                                                    backgroundColor: isEven ? tileColor1 : tileColor2 
                                                                }}
                                                            >
                                                                {tileLabel && (
                                                                    <span 
                                                                        className="font-bold opacity-30 select-none" 
                                                                        style={{ 
                                                                            fontSize: `${tileNumberSize}px`, 
                                                                            color: tileNumberColor, 
                                                                            textShadow: '0 0 5px rgba(0,0,0,0.7)' 
                                                                        }}
                                                                    >
                                                                        {tileLabel}
                                                                    </span>
                                                                )}
                                                                {isPortStart && (
                                                                    <div 
                                                                        className={cn(
                                                                            "absolute flex items-center justify-center w-10 h-10 rounded-full text-white font-black text-xl z-30 shadow-2xl border-2 border-white/20", 
                                                                            wiringMode === 'data' ? 'bg-green-600' : 'bg-red-600'
                                                                        )} 
                                                                        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                                                                    >
                                                                        {wiringMode === 'power' ? `P${portIndex + 1}` : portIndex + 1}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                        
                                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20">
                                            {portChunks.map((chunk) => (
                                                <React.Fragment key={`chunk-${chunk[0].row}-${chunk[0].col}`}>
                                                    {chunk.slice(0, -1).map((panel, i) => {
                                                        const toPanel = chunk[i + 1];
                                                        const fromPos = panelPositions[`${panel.row}-${panel.col}`];
                                                        const toPos = panelPositions[`${toPanel.row}-${toPanel.col}`];
                                                        
                                                        if (!fromPos || !toPos) return null;
                                                        return <Arrow key={`${i}`} from={{ x: fromPos.cx, y: fromPos.cy }} to={{ x: toPos.cx, y: toPos.cy }} color={ARROW_COLOR} />
                                                    })}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <ScrollBar orientation="horizontal" />
                            <ScrollBar orientation="vertical" />
                        </ScrollArea>
                    ) : (
                    <div className="p-6">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Preview Too Large</AlertTitle>
                            <AlertDescription>
                            The panel grid is too large to render a diagram ({totalPanels.toLocaleString()} panels). Maximum is {MAX_PANELS_TO_RENDER}.
                            Please reduce the panel count in the settings.
                            </AlertDescription>
                        </Alert>
                    </div>
                    )}
                </CardContent>
            </Card>
            <div className="flex gap-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase bg-muted/50 px-3 py-1.5 rounded-full border">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Data Flow</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase bg-muted/50 px-3 py-1.5 rounded-full border">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Power Flow</span>
                </div>
            </div>
        </div>
    )
}
