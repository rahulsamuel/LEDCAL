
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tv, Monitor, Cable, Zap, GitBranch, AlertTriangle, Server } from 'lucide-react';
import { useProjectContext, WiringPattern, STRIP_GAP, PROJECTION_COLORS } from '@/contexts/project-context';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';


const MM_TO_INCHES = 0.0393701;
const MM_TO_FEET = 0.00328084;
const KG_TO_LBS = 2.20462;

const gcd = (a: number, b: number): number => {
    if (!isFinite(a) || !isFinite(b) || a === 0 || b === 0) {
        return 1;
    }
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

const toFeetAndFractionalInches = (decimalInches: number): string => {
    if (!isFinite(decimalInches)) return `0' 0"`;
    const feet = Math.floor(decimalInches / 12);
    const remainingInches = decimalInches % 12;
    const wholeInches = Math.floor(remainingInches);
    const fraction = remainingInches - wholeInches;
    
    if (fraction === 0) return `${feet}' ${wholeInches}"`;
    const sixteenths = Math.round(fraction * 16);
    if (sixteenths === 0) return `${feet}' ${wholeInches}"`;
    if (sixteenths === 16) return `${feet}' ${wholeInches + 1}"`;

    const divisor = gcd(sixteenths, 16);
    const numerator = sixteenths / divisor;
    const denominator = 16 / divisor;

    if (wholeInches === 0 && feet === 0) return `${numerator}/${denominator}"`;
    if (wholeInches === 0) return `${feet}' ${numerator}/${denominator}"`;
    return `${feet}' ${wholeInches} ${numerator}/${denominator}"`;
};

const resolutionPresets = {
  '1080p': { width: 1920, height: 1080 },
  '4K UHD': { width: 3840, height: 2160 },
  'DCI 4K': { width: 4096, height: 2160 },
};

const getPanelSequence = (width: number, height: number, pattern: WiringPattern) => {
    const sequence: { row: number, col: number }[] = [];
    switch (pattern) {
        case 'left-to-right':
            for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) sequence.push({ row: r, col: c });
            break;
        case 'right-to-left':
            for (let r = 0; r < height; r++) for (let c = width - 1; c >= 0; c--) sequence.push({ row: r, col: c });
            break;
        case 'top-to-bottom':
            for (let c = 0; c < width; c++) for (let r = 0; r < height; r++) sequence.push({ row: r, col: c });
            break;
        case 'bottom-to-top':
            for (let c = 0; c < width; c++) for (let r = height - 1; r >= 0; r--) sequence.push({ row: r, col: c });
            break;
        case 'serpentine-lr':
            for (let r = 0; r < height; r++) {
                if (r % 2 === 0) for (let c = 0; c < width; c++) sequence.push({ row: r, col: c });
                else for (let c = width - 1; c >= 0; c--) sequence.push({ row: r, col: c });
            }
            break;
        case 'serpentine-rl':
            for (let r = 0; r < height; r++) {
                if (r % 2 === 0) for (let c = width - 1; c >= 0; c--) sequence.push({ row: r, col: c });
                else for (let c = 0; c < width; c++) sequence.push({ row: r, col: c });
            }
            break;
        case 'serpentine-tb-lr':
            for (let c = 0; c < width; c++) {
                if (c % 2 === 0) for (let r = 0; r < height; r++) sequence.push({ row: r, col: c });
                else for (let r = height - 1; r >= 0; r--) sequence.push({ row: r, col: c });
            }
            break;
        case 'serpentine-tb-rl':
            for (let c = width - 1; c >= 0; c--) {
                if ((width - 1 - c) % 2 === 0) for (let r = 0; r < height; r++) sequence.push({ row: r, col: c });
                else for (let r = height - 1; r >= 0; r--) sequence.push({ row: r, col: c });
            }
            break;
        default:
            for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) sequence.push({ row: r, col: c });
            break;
    }
    return sequence;
};

const Arrow = ({ from, to, color }: { from: {x:number, y:number}, to: {x:number, y:number}, color: string }) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
    const length = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));

    return (
        <div className="absolute" style={{ left: `${from.x}px`, top: `${from.y}px`, width: `${length}px`, transformOrigin: 'left center', transform: `rotate(${angle}deg)` }}>
            <svg width={length} height="10" viewBox={`0 0 ${length} 10`} className="overflow-visible">
                <line x1="0" y1="5" x2={length - 8} y2="5" stroke={color} strokeWidth="2" />
                <polygon points={`${length-8},0 ${length},5 ${length-8},10`} fill={color} />
            </svg>
        </div>
    );
};

interface WiringDiagramExportProps {
    wiringMode: 'data' | 'power';
    id: string;
}

const WiringDiagramExportContent: React.FC<WiringDiagramExportProps> = ({ wiringMode, id }) => {
    const { getActiveScreen, powerAndDataCalculations, state } = useProjectContext();
    const activeScreen = getActiveScreen();

    if (!activeScreen) return null;

    const {
        ledScreenWidth, ledScreenHeight, ledTileWidthPx, ledTileHeightPx, tileNumbering,
        tileNumberColor, tileNumberSize, tileColor1, tileColor2, wiringPattern, powerWiringPattern,
        isMixed, ledScreenHalfWidth, ledScreenHalfHeight
    } = activeScreen;
    
    const { panelsPerPort, panelsPer20A_Circuit } = powerAndDataCalculations;
    
    const numRows = ledScreenHeight + (isMixed && ledScreenHalfHeight > 0 ? 1 : 0);
    const numCols = ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0);
    const totalPanels = numRows * numCols;
    const currentPattern = wiringMode === 'data' ? wiringPattern : powerWiringPattern;
    
    const panelSequence = getPanelSequence(numCols, numRows, currentPattern);
    const panelsPerChunk = wiringMode === 'data' ? panelsPerPort : panelsPer20A_Circuit;
    
    const portChunks: { row: number, col: number }[][] = [];
    if (panelsPerChunk > 0) {
        for (let i = 0; i < panelSequence.length; i += panelsPerChunk) {
            portChunks.push(panelSequence.slice(i, i + panelsPerChunk));
        }
    }
    
    const panelPositions: { [key: string]: { x: number, y: number, cx: number, cy: number, tx: number, ty: number, bx: number, by: number, lx: number, ly: number, rx: number, ry: number } } = {};
    const BASE_TILE_SIZE = 100;
    const TILE_GAP = 20;
    const aspectRatioWiring = (ledTileWidthPx > 0 && ledTileHeightPx > 0) ? ledTileWidthPx / ledTileHeightPx : 1;
    const TILE_WIDTH = aspectRatioWiring >= 1 ? BASE_TILE_SIZE : BASE_TILE_SIZE * aspectRatioWiring;
    const TILE_HEIGHT = aspectRatioWiring < 1 ? BASE_TILE_SIZE : BASE_TILE_SIZE / aspectRatioWiring;
    const ARROW_COLOR = wiringMode === 'data' ? 'rgb(34 197 94 / 0.9)' : 'rgb(239 68 68 / 0.9)';

    return (
        <div id={id} className="relative p-2" style={{ width: (numCols * TILE_WIDTH) + ((numCols - 1) * TILE_GAP), height: (numRows * TILE_HEIGHT) + ((numRows - 1) * TILE_GAP) }}>
            {Array.from({ length: totalPanels }).map((_, index) => {
                const row = Math.floor(index / numCols); const col = index % numCols; const isEven = (row + col) % 2 === 0;
                const x = col * (TILE_WIDTH + TILE_GAP); const y = row * (TILE_HEIGHT + TILE_GAP);
                panelPositions[`${row}-${col}`] = { x, y, cx: x + TILE_WIDTH / 2, cy: y + TILE_HEIGHT / 2, tx: x + TILE_WIDTH / 2, ty: y, bx: x + TILE_WIDTH / 2, by: y + TILE_HEIGHT, lx: x, ly: y + TILE_HEIGHT / 2, rx: x + TILE_WIDTH, ry: y + TILE_HEIGHT / 2 };
                let tileLabel: string | null = null;
                if (tileNumbering !== 'none') {
                    if (tileNumbering === 'sequential') tileLabel = (index + 1).toString();
                    else if (tileNumbering === 'col-row') tileLabel = `${col + 1}-${row + 1}`;
                    else if (tileNumbering === 'row-col') tileLabel = `${String.fromCharCode(65 + row)}${col + 1}`;
                }
                const sequenceIndex = panelSequence.findIndex(p => p.row === row && p.col === col);
                const portIndex = Math.floor(sequenceIndex / panelsPerChunk);
                const isPortStart = (sequenceIndex % panelsPerChunk) === 0;

                return (
                    <div key={index} className="absolute flex items-center justify-center rounded text-xs font-semibold border" style={{ left: x, top: y, backgroundColor: isEven ? tileColor1 : tileColor2, width: TILE_WIDTH, height: TILE_HEIGHT }}>
                        {tileLabel && <span className="font-bold" style={{ fontSize: `${tileNumberSize}px`, color: tileNumberColor, textShadow: '0 0 5px rgba(0,0,0,0.7)' }}>{tileLabel}</span>}
                        {isPortStart && <div className={cn("absolute flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-lg", wiringMode === 'data' ? 'bg-green-500' : 'bg-red-500')} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>{wiringMode === 'power' ? `P${portIndex + 1}` : portIndex + 1}</div>}
                    </div>
                );
            })}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {portChunks.map((chunk, portIndex) => (
                    <React.Fragment key={portIndex}>
                        {chunk.slice(0, -1).map((panel, i) => {
                            const fromPos = panelPositions[`${panel.row}-${panel.col}`]; const toPos = panelPositions[`${chunk[i + 1].row}-${chunk[i + 1].col}`]; if (!fromPos || !toPos) return null;
                            let start = { x: fromPos.cx, y: fromPos.cy }; let end = { x: toPos.cx, y: toPos.cy };
                            if (fromPos.x === toPos.x) { if (fromPos.y < toPos.y) { start = { x: fromPos.bx, y: fromPos.by }; end = { x: toPos.tx, y: toPos.ty }; } else { start = { x: fromPos.tx, y: fromPos.ty }; end = { x: fromPos.bx, y: 0 }; } }
                            else if (fromPos.y === toPos.y) { if (fromPos.x < toPos.x) { start = { x: fromPos.rx, y: fromPos.ry }; end = { x: toPos.lx, y: toPos.ly }; } else { start = { x: fromPos.lx, y: fromPos.ly }; end = { x: toPos.rx, y: toPos.ry }; } }
                            return <Arrow key={i} from={start} to={end} color={ARROW_COLOR} />
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

const HardwareRequirementsExport = () => {
    const { state, getActiveScreen } = useProjectContext();
    const { ledProducts } = state;
    const activeScreen = getActiveScreen();

    const totalWeightLbs = useMemo(() => {
        if (!activeScreen) return 0;
        const { ledScreenWidth, ledScreenHeight, isMixed, ledScreenHalfWidth, ledScreenHalfHeight, ledHalfProduct, panelWeight, ledProduct, ledManufacturer } = activeScreen;
        const fullPanelsCount = ledScreenWidth * ledScreenHeight;
        let halfPanelsCount = 0; let halfPanelWeight = 0;
        if (isMixed) {
            const halfProductData = ledProducts.find(p => p.name === ledHalfProduct && p.manufacturer === ledManufacturer);
            if (halfProductData) { halfPanelsCount = (ledScreenHalfWidth * (ledScreenHeight + (ledScreenHalfHeight > 0 ? 1 : 0))) + (ledScreenWidth * ledScreenHalfHeight); halfPanelWeight = halfProductData.weight_kg; }
        }
        const totalWeightKg = (fullPanelsCount * panelWeight) + (halfPanelsCount * halfPanelWeight);
        return totalWeightKg * KG_TO_LBS;
    }, [activeScreen, ledProducts]);

    if (!activeScreen) return null;

    const { ledScreenWidth, ledScreenHeight, panelHeightMM, mountingType, ledManufacturer, ledProduct, sandbagWeight, cornerBlock, isMixed, ledScreenHalfHeight, ledScreenHalfWidth } = activeScreen;
    const selectedProduct = ledProducts.find(p => p.name === ledProduct && p.manufacturer === ledManufacturer);

    if (!selectedProduct) return null;

    let mountingWarning = null;
    const totalHeightTiles = ledScreenHeight + (isMixed && ledScreenHalfHeight > 0 ? 1 : 0);
    if (mountingType === 'flown' && selectedProduct.max_tiles_flown > 0 && totalHeightTiles > selectedProduct.max_tiles_flown) {
        mountingWarning = `Warning: Screen height of ${totalHeightTiles} tiles exceeds the manufacturer's recommended limit of ${selectedProduct.max_tiles_flown} for a flown configuration.`;
    } else if (mountingType === 'ground-stack' && selectedProduct.max_tiles_ground > 0 && totalHeightTiles > selectedProduct.max_tiles_ground) {
        mountingWarning = `Warning: Screen height of ${totalHeightTiles} tiles exceeds the manufacturer's recommended limit of ${selectedProduct.max_tiles_ground} for a ground-stack configuration.`;
    }

    let hardwareList: { name: string, quantity: number }[] = [];
    if (mountingType === 'flown' && ledScreenWidth > 0) {
        const totalWidthInPanels = ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0);
        const doubleWideBars = Math.floor(totalWidthInPanels / 2); const singleWideBars = totalWidthInPanels % 2;
        if (doubleWideBars > 0) hardwareList.push({ name: 'Header Bar Double Wide', quantity: doubleWideBars });
        if (singleWideBars > 0) hardwareList.push({ name: 'Header Bar Single Wide', quantity: singleWideBars });
    }
    if (mountingType === 'ground-stack' && (ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0)) > 0) {
        const totalWidthInPanels = ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0);
        const doubleWideBars = Math.floor(totalWidthInPanels / 2); const singleWideBars = totalWidthInPanels % 2;
        if (doubleWideBars > 0) hardwareList.push({ name: 'Double wide stacking bar', quantity: doubleWideBars });
        if (singleWideBars > 0) hardwareList.push({ name: 'Single wide stacking bar', quantity: singleWideBars });
        const totalStackingBars = doubleWideBars + singleWideBars;
        if (totalStackingBars > 0) {
            hardwareList.push({ name: 'Outriggers', quantity: totalStackingBars });
            const screenHeightInMeters = ((ledScreenHeight * panelHeightMM) + (isMixed && ledScreenHalfHeight > 0 ? (selectedProduct.height_mm / 2) : 0)) / 1000;
            const oneMeterTrussesPerStack = Math.floor(screenHeightInMeters); const halfMeterTrussesPerStack = (screenHeightInMeters % 1) > 0 ? 1 : 0;
            const totalOneMeterTrusses = totalStackingBars * oneMeterTrussesPerStack; const totalHalfMeterTrusses = totalStackingBars * halfMeterTrussesPerStack;
            if (totalOneMeterTrusses > 0) hardwareList.push({ name: 'Vertical Truss (1m)', quantity: totalOneMeterTrusses });
            if (totalHalfMeterTrusses > 0) hardwareList.push({ name: 'Vertical Truss (0.5m)', quantity: totalHalfMeterTrusses });
            const rearClampCount = totalOneMeterTrusses + totalHalfMeterTrusses;
            if (rearClampCount > 0) hardwareList.push({ name: 'Rear clamp count', quantity: rearClampCount });
        }
        if (totalWeightLbs > 0 && sandbagWeight > 0) {
            const numberOfSandbags = Math.ceil(totalWeightLbs / sandbagWeight);
            hardwareList.push({ name: `Number of Sandbags (${sandbagWeight} Lbs)`, quantity: numberOfSandbags });
        }
    }
    if (mountingType === 'floor' && ledScreenWidth > 0 && ledScreenHeight > 0) {
        let w = ledScreenWidth; let h = ledScreenHeight;
        const frames = { '3x2': 0, '2x2': 0, '2x1': 0, '1x2': 0, '1x1': 0 };
        frames['3x2'] = Math.floor(w / 3) * Math.floor(h / 2); let remainingWafter3x2 = w % 3; let remainingHafter3x2 = h % 2;
        let coveredW = w - remainingWafter3x2;
        let tempH = h; frames['2x2'] += Math.floor(remainingWafter3x2 / 2) * Math.floor(tempH / 2); frames['2x1'] += Math.floor(remainingWafter3x2 / 2) * (tempH % 2);
        let tempW = remainingWafter3x2 % 2; frames['1x2'] += tempW * Math.floor(tempH / 2); frames['1x1'] += tempW * (tempH % 2);
        tempW = coveredW; frames['2x1'] += Math.floor(tempW / 2) * remainingHafter3x2; frames['1x1'] += (tempW % 2) * remainingHafter3x2;
        hardwareList = Object.entries(frames).filter(([, quantity]) => quantity > 0).map(([name, quantity]) => ({ name: `${name} Frame`, quantity }));
    }
    if (mountingType !== 'floor' && cornerBlock && (ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0)) > 0 && (ledScreenHeight + (isMixed && ledScreenHalfHeight > 0 ? 1 : 0)) > 0) {
        const C = ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0);
        const R = ledScreenHeight + (isMixed && ledScreenHalfHeight > 0 ? 1 : 0);
        if (C > 1 && R > 1) {
            let fourWayConnectors = (C - 1) * (R - 1);
            if (fourWayConnectors > 0) { hardwareList.push({ name: '4-Way Connector/Block', quantity: fourWayConnectors }); }
        }
        const twoWayConnectors = (((R - 1) * 2) + 2) + (C - 1);
        if (twoWayConnectors > 0) hardwareList.push({ name: '2-Way Connector/Block', quantity: twoWayConnectors });
    }

    return (
        <div id="hardware-req-pdf-export" className="p-8 bg-white text-black" style={{ width: '800px' }}>
            <Card>
                <CardHeader><CardTitle>Hardware Requirements ({activeScreen.name} - {mountingType})</CardTitle></CardHeader>
                <CardContent>
                    {mountingWarning && <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-md flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{mountingWarning}</div>}
                    {hardwareList.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Quantity</TableHead></TableRow></TableHeader>
                            <TableBody>{hardwareList.map(item => (<TableRow key={item.name}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{item.quantity}</TableCell></TableRow>))}</TableBody>
                        </Table>
                    ) : ( <div className="text-center py-8">No specific hardware requirements for the current configuration.</div>)}
                </CardContent>
            </Card>
        </div>
    );
};

const MediaServerExport = () => {
    const { state } = useProjectContext();
    const { rasters, mediaServer, mediaServers } = state;

    const selectedServer = mediaServers.find(s => s.id === mediaServer.selectedServerId);

    const totalResolution = rasters.reduce((acc, raster) => {
        const width = raster.resolutionPreset === 'Custom' ? raster.customWidth : (resolutionPresets[raster.resolutionPreset as keyof typeof resolutionPresets]?.width || 1920);
        const height = raster.resolutionPreset === 'Custom' ? raster.customHeight : (resolutionPresets[raster.resolutionPreset as keyof typeof resolutionPresets]?.height || 1080);
        return { width: Math.max(acc.width, width), height: acc.height + height };
    }, { width: 0, height: 0 });

    const numRasters = rasters.length;

    return (
        <div id="media-server-pdf-export" className="p-8 bg-white text-black" style={{ width: '800px' }}>
            <Card>
                <CardHeader>
                    <CardTitle>Media Server & Playback Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-6 text-sm">
                        <div className="space-y-1">
                            <p className="text-gray-600">Total Required Resolution</p>
                            <p className="font-bold">{totalResolution.width} x {totalResolution.height} px</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-600">Number of Outputs (Rasters)</p>
                            <p className="font-bold">{numRasters}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-600">Selected Media Server</p>
                            <p className="font-bold">{selectedServer?.name || 'Not Selected'}</p>
                        </div>
                    </div>
                    {selectedServer && selectedServer.id !== 'custom' && (
                        <div>
                            <h4 className="font-semibold mb-2">{selectedServer.name} Specifications</h4>
                            <Table>
                                <TableBody>
                                    <TableRow><TableCell className="font-medium">Max Outputs</TableCell><TableCell>{selectedServer.outputs}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium">Max Resolution per Output</TableCell><TableCell>{selectedServer.maxResolution}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium">Recommended Video Codecs</TableCell><TableCell>{selectedServer.codecs.join(', ')}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-medium">Audio Format</TableCell><TableCell>{selectedServer.audio}</TableCell></TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


export function ProjectExport() {
    const { getActiveScreen, getActiveRaster, state, powerAndDataCalculations } = useProjectContext();
    const [currentDate, setCurrentDate] = useState<string | null>(null);
    const activeScreen = getActiveScreen();
    const activeRaster = getActiveRaster();

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString());
    }, []);


    if (!activeScreen) return null;
    
    const { calculator: calcState, ledProducts } = state;
    const isCurved = calcState.wallShape === 'concave' || calcState.wallShape === 'convex';


    const {
        ledManufacturer, ledProduct, ledScreenWidth, ledScreenHeight, isMixed, ledScreenHalfWidth, ledScreenHalfHeight, ledHalfProduct,
        ledTileWidthPx, ledTileHeightPx,
        panelWidthMM, panelHeightMM, panelWeight, panelPowerMax, panelPowerAvg, ledTileBorderPx,
        borderColor, tileColor1, tileColor2, showScalingOverlay, tileNumbering,
        tileNumberSize, tileNumberColor, halfPanelPosition, overlayTexts
    } = activeScreen;

    const halfProductData = isMixed ? ledProducts.find(p => p.manufacturer === ledManufacturer && p.name === ledHalfProduct) : undefined;
    const fullPanelsCount = ledScreenWidth * ledScreenHeight;
    
    const numRows = ledScreenHeight + (isMixed && ledScreenHalfHeight > 0 ? 1 : 0);
    const numCols = ledScreenWidth + (isMixed && ledScreenHalfWidth > 0 ? 1 : 0);
    const totalPanels = numRows * numCols;

    const screenResolutionX = (ledScreenWidth * ledTileWidthPx) + (isMixed && ledScreenHalfWidth > 0 ? (halfProductData ? halfProductData.width_px : ledTileWidthPx / 2) : 0);
    const screenResolutionY = (ledScreenHeight * ledTileHeightPx) + (isMixed && ledScreenHalfHeight > 0 ? (halfProductData ? halfProductData.height_px : ledTileHeightPx / 2) : 0);
    const totalPixels = screenResolutionX * screenResolutionY;
    const aspectRatioDivisor = gcd(screenResolutionX, screenResolutionY);
    const aspectX = screenResolutionX / aspectRatioDivisor;
    const aspectY = screenResolutionY / aspectRatioDivisor;
    const aspectDecimal = screenResolutionX > 0 && screenResolutionY > 0 ? screenResolutionX / screenResolutionY : 0;
    
    let curveCalculations: any = null;
    if (isCurved && panelWidthMM > 0 && ledScreenWidth >= 2) {
      const numTiles = ledScreenWidth;
      const arcLength = numTiles * panelWidthMM;

      let totalAngleRad = Math.PI / 2; 
      for (let i = 0; i < 5; i++) { 
          const f = arcLength * Math.sin(totalAngleRad / 2) - numTiles * panelWidthMM * (totalAngleRad / 2);
          const f_prime = (arcLength / 2) * Math.cos(totalAngleRad / 2) - (numTiles * panelWidthMM) / 2;
          if (Math.abs(f_prime) < 1e-9) break;
          totalAngleRad = totalAngleRad - f / f_prime;
      }
      
      const radiusMM = totalAngleRad > 0 ? arcLength / totalAngleRad : 0;
      const chordLength = radiusMM > 0 ? 2 * radiusMM * Math.sin(totalAngleRad / 2) : 0;
      const bendAngleDeg = numTiles > 1 ? (totalAngleRad * 180 / Math.PI) / (numTiles - 1) : 0;

      curveCalculations = {
          numTiles: parseFloat(numTiles.toFixed(2)),
          bendAngle: { deg: `${bendAngleDeg.toFixed(2)}°`},
          radius: { 
            mm: `${radiusMM.toFixed(1)} mm`,
            m: `${(radiusMM / 1000).toFixed(2)} m`,
            inches: `${(radiusMM * MM_TO_INCHES).toFixed(2)}"`,
            feet: toFeetAndFractionalInches(radiusMM * MM_TO_INCHES)
          },
          arcLength: { 
            mm: `${arcLength.toFixed(1)} mm`,
            m: `${(arcLength / 1000).toFixed(2)} m`,
            inches: `${(arcLength * MM_TO_INCHES).toFixed(2)}"`,
            feet: toFeetAndFractionalInches(radiusMM * MM_TO_INCHES)
           },
          chordLength: { 
            mm: `${chordLength.toFixed(1)} mm`,
            m: `${(chordLength / 1000).toFixed(2)} m`,
            inches: `${(chordLength * MM_TO_INCHES).toFixed(2)}"`,
            feet: toFeetAndFractionalInches(chordLength * MM_TO_INCHES)
          },
      };
    }
    
    const totalWidthMM = isCurved && curveCalculations ? parseFloat(curveCalculations.arcLength.mm.replace(' mm','')) : (ledScreenWidth * panelWidthMM) + (isMixed && ledScreenHalfWidth > 0 && halfProductData ? halfProductData.width_mm : 0);
    const fullPanelsHeightMM = ledScreenHeight * panelHeightMM;
    const halfPanelsHeightMM = isMixed && ledScreenHalfHeight > 0 && halfProductData ? halfProductData.height_mm : 0;
    const totalHeightMM = fullPanelsHeightMM + halfPanelsHeightMM;

    const totalAreaM2 = (totalWidthMM / 1000) * (totalHeightMM / 1000);
    const totalWidthIn = totalWidthMM * MM_TO_INCHES;
    const totalHeightIn = totalHeightMM * MM_TO_INCHES;
    
    const fullPanelsWeightKg = fullPanelsCount * panelWeight;
    const halfPanelsWeightKg = (totalPanels - fullPanelsCount) * (halfProductData?.weight_kg || 0);
    const totalWeightKg = fullPanelsWeightKg + halfPanelsWeightKg;
    const totalWeightLbs = totalWeightKg * KG_TO_LBS;
    
    const fullPanelsMaxPowerW = fullPanelsCount * panelPowerMax;
    const halfPanelsMaxPowerW = (totalPanels - fullPanelsCount) * (halfProductData?.power_watts_max || 0);
    const totalMaxPowerW = fullPanelsMaxPowerW + halfPanelsMaxPowerW;
    const fullPanelsAvgPowerW = fullPanelsCount * panelPowerAvg;
    const halfPanelsAvgPowerW = (totalPanels - fullPanelsCount) * (halfProductData?.power_watts_avg || 0);
    const totalAvgPowerW = fullPanelsAvgPowerW + halfPanelsAvgPowerW;


    const powerPerSqMMax = totalAreaM2 > 0 ? totalMaxPowerW / totalAreaM2 : 0;
    const powerPerSqMAvg = totalAreaM2 > 0 ? totalAvgPowerW / totalAreaM2 : 0;
    const voltage = state.calculator.operatingVoltage;
    const phaseDivisor = state.calculator.phaseConfiguration === 'three' ? Math.sqrt(3) : 1;
    const maxAmps = voltage > 0 && phaseDivisor > 0 ? totalMaxPowerW / (voltage * phaseDivisor) : 0;
    const avgAmps = voltage > 0 && phaseDivisor > 0 ? totalAvgPowerW / (voltage * phaseDivisor) : 0;
    
    const tileConfigString = isMixed 
    ? `Full: ${ledScreenWidth}×${ledScreenHeight}, Half: ${ledScreenHalfWidth}x${ledScreenHeight + (ledScreenHalfHeight > 0 ? 1 : 0)} / ${ledScreenWidth}x${ledScreenHalfHeight} (${totalPanels} total)`
    : `${ledScreenWidth}×${ledScreenHeight} tiles (${totalPanels} total)`;

    const ledCalcData = {
        resolution: `${screenResolutionX} × ${screenResolutionY} pixels`, totalPixels: totalPixels.toLocaleString(),
        tileConfiguration: tileConfigString,
        aspectRatio: `${aspectX}:${aspectY} (${aspectDecimal.toFixed(2)}:1)`,
        physical: {
            total: {
                mm: `${totalWidthMM.toFixed(1)} × ${totalHeightMM.toFixed(1)} mm`,
                m: `${(totalWidthMM/1000).toFixed(2)} × ${(totalHeightMM/1000).toFixed(2)} m`,
                in: `${totalWidthIn.toFixed(1)} × ${totalHeightIn.toFixed(1)} in`,
                ftIn: `${toFeetAndFractionalInches(totalWidthIn)} × ${toFeetAndFractionalInches(totalHeightIn)}`,
            },
            full: {
                height_m: `${(fullPanelsHeightMM / 1000).toFixed(2)} m`,
                height_ftIn: toFeetAndFractionalInches(fullPanelsHeightMM * MM_TO_INCHES),
            },
            half: {
                height_m: `${(halfPanelsHeightMM / 1000).toFixed(2)} m`,
                height_ftIn: toFeetAndFractionalInches(halfPanelsHeightMM * MM_TO_INCHES),
            },
        },
        weight: {
            total_kg: `${totalWeightKg.toFixed(1)} kg`,
            total_lbs: `${totalWeightLbs.toFixed(1)} lbs`,
            full_kg: `${fullPanelsWeightKg.toFixed(1)} kg`,
            full_lbs: `${(fullPanelsWeightKg * KG_TO_LBS).toFixed(1)} lbs`,
            half_kg: `${halfPanelsWeightKg.toFixed(1)} kg`,
            half_lbs: `${(halfPanelsWeightKg * KG_TO_LBS).toFixed(1)} lbs`,
        },
        power: {
            perSqmMax: `${powerPerSqMMax.toFixed(0)} W/m²`,
            perSqmAvg: `${powerPerSqMAvg.toFixed(0)} W/m²`,
            totalMaxW: `${totalMaxPowerW.toFixed(2)} W`,
            totalAvgW: `${totalAvgPowerW.toFixed(2)} W`,
            fullMaxW: `${fullPanelsMaxPowerW.toFixed(2)} W`,
            fullAvgW: `${fullPanelsAvgPowerW.toFixed(2)} W`,
            halfMaxW: `${halfPanelsMaxPowerW.toFixed(2)} W`,
            halfAvgW: `${halfPanelsAvgPowerW.toFixed(2)} W`,
            maxAmps: `${maxAmps.toFixed(2)} A`,
            avgAmps: `${avgAmps.toFixed(2)} A`,
        },
        voltage: state.calculator.operatingVoltage,
        phase: state.calculator.phaseConfiguration === 'three' ? 'Three Phase' : 'Single Phase',
        ledManufacturer, ledProduct,
    };

    const { panelsPerPort, totalPortsNeeded, totalProcessors, panelsPer20A_Circuit, totalCircuitsNeeded } = powerAndDataCalculations;
    const powerData = { totalPanels, totalPixels, screenResolutionX, screenResolutionY, panelsPerPort, totalPortsNeeded, totalProcessors, panelsPer20A_Circuit, totalCircuitsNeeded, voltage: powerAndDataCalculations.voltage, phase: powerAndDataCalculations.phase };

    const totalWidthPxExport = (ledScreenWidth * ledTileWidthPx) + (isMixed && ledScreenHalfWidth > 0 && halfProductData ? halfProductData.width_px : 0);
    const totalHeightPxExport = (ledScreenHeight * ledTileHeightPx) + (isMixed && ledScreenHalfHeight > 0 && halfProductData ? halfProductData.height_px : 0);
    
    const activeRasterData = activeRaster && {
        canvasWidth: activeRaster.resolutionPreset === 'Custom' ? activeRaster.customWidth : (resolutionPresets[activeRaster.resolutionPreset as keyof typeof resolutionPresets]?.width || 1920),
        canvasHeight: activeRaster.resolutionPreset === 'Custom' ? activeRaster.customHeight : (resolutionPresets[activeRaster.resolutionPreset as keyof typeof resolutionPresets]?.height || 1080),
        renderedScreens: Object.keys(activeRaster.screenAssignments).filter(screenId => activeRaster.screenAssignments[screenId]).map(screenId => {
            const screen = state.pixelMaps.find(p => p.id === screenId);
            const setting = activeRaster.screenSettings.find(s => s.screenId === screenId);
            if (!screen || !setting) return null;

            const halfProduct = screen.isMixed ? state.ledProducts.find(p => p.manufacturer === screen.ledManufacturer && p.name === screen.ledHalfProduct) : undefined;
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
        }).filter(Boolean),
    };
    
    const getTileLabelExport = (screen: any, row: number, col: number) => {
        if (!activeRaster?.showTileLabels || screen.tileNumbering === 'none') return null;
        const totalColsExport = screen.ledScreenWidth + (screen.isMixed && screen.ledScreenHalfWidth > 0 ? 1 : 0);
        let sequentialIndex = row * totalColsExport + col;
        switch (screen.tileNumbering) {
            case 'sequential': return (sequentialIndex + 1).toString();
            case 'col-row': return `${col + 1}-${row + 1}`;
            case 'row-col': return `${String.fromCharCode(65 + row)}${col + 1}`;
            default: return null;
        }
    };

    const getProcessedText = (text: string) => {
        return text
            .replace('{width}', screenResolutionX.toString())
            .replace('{height}', screenResolutionY.toString())
            .replace('{name}', activeScreen.name);
    };


    return (
        <>
            <div id="led-calc-pdf-export" className="p-8 bg-white text-black" style={{ width: '800px', fontFamily: 'var(--font-space-mono), monospace' }}>
                <div className="text-center mb-8"><h1 className="text-3xl font-bold">{state.projectName}</h1>{currentDate && <p className="text-gray-500">{currentDate}</p>}</div>
                <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-2 gap-6"><Card className="bg-white text-black"><CardHeader className="flex flex-row items-center gap-2"><Tv className="w-5 h-5" /><CardTitle>LED Product</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-6 text-sm"><div className="space-y-1"><p className="text-gray-600">Manufacturer</p><p className="font-bold">{ledCalcData.ledManufacturer}</p></div><div className="space-y-1"><p className="text-gray-600">Product</p><p className="font-bold">{ledCalcData.ledProduct}{isMixed ? ' (Mixed)' : ''}</p></div></CardContent></Card><Card className="bg-white text-black"><CardHeader><CardTitle>Screen Resolution & Properties</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-6 text-sm"><div className="space-y-1"><p className="text-gray-600">Resolution</p><p className="font-bold">{ledCalcData.resolution}</p></div><div className="space-y-1"><p className="text-gray-600">Total Pixels</p><p className="font-bold">{ledCalcData.totalPixels}</p></div><div className="space-y-1"><p className="text-gray-600">Tile Config</p><p className="font-bold">{ledCalcData.tileConfiguration}</p></div><div className="space-y-1"><p className="text-gray-600">Aspect Ratio</p><p className="font-bold">{ledCalcData.aspectRatio}</p></div></CardContent></Card></div>

                    {isCurved && curveCalculations && (
                        <Card className="bg-white text-black">
                            <CardHeader><CardTitle>Curve Properties</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-5 gap-6 text-sm">
                                <div className="space-y-1"><p className="text-gray-600">Tiles per Arc</p><p className="font-bold">{curveCalculations.numTiles}</p></div>
                                <div className="space-y-1"><p className="text-gray-600">Bend Angle</p><p className="font-bold">{curveCalculations.bendAngle.deg}</p></div>
                                <div className="space-y-1"><p className="text-gray-600">Radius</p><p className="font-bold">{curveCalculations.radius.m}</p><p className="text-xs">{curveCalculations.radius.mm}</p><p className="font-bold mt-2">{curveCalculations.radius.feet}</p><p className="text-xs">{curveCalculations.radius.inches}</p></div>
                                <div className="space-y-1"><p className="text-gray-600">Arc Length</p><p className="font-bold">{curveCalculations.arcLength.m}</p><p className="text-xs">{curveCalculations.arcLength.mm}</p><p className="font-bold mt-2">{curveCalculations.arcLength.feet}</p><p className="text-xs">{curveCalculations.arcLength.inches}</p></div>
                                <div className="space-y-1"><p className="text-gray-600">Chord Length</p><p className="font-bold">{curveCalculations.chordLength.m}</p><p className="text-xs">{curveCalculations.chordLength.mm}</p><p className="font-bold mt-2">{curveCalculations.chordLength.feet}</p><p className="text-xs">{curveCalculations.chordLength.inches}</p></div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-2 gap-6"><Card className="bg-white text-black"><CardHeader><CardTitle>Physical Dimensions</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="font-semibold mb-2">Metric (Total)</p>
                            <p className="font-bold">{ledCalcData.physical.total.m}</p>
                            {isMixed && (
                                <div className="mt-2 pt-2 border-t text-xs text-gray-600 space-y-1">
                                    <p>Full Panel Height: {ledCalcData.physical.full.height_m}</p>
                                    <p>Half Panel Height: {ledCalcData.physical.half.height_m}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-semibold mb-2">Imperial (Total)</p>
                            <p className="font-bold">{ledCalcData.physical.total.ftIn}</p>
                            {isMixed && (
                                <div className="mt-2 pt-2 border-t text-xs text-gray-600 space-y-1">
                                    <p>Full Panel Height: {ledCalcData.physical.full.height_ftIn}</p>
                                    <p>Half Panel Height: {ledCalcData.physical.half.height_ftIn}</p>
                                </div>
                            )}
                        </div>
                    </CardContent></Card><Card className="bg-white text-black"><CardHeader><CardTitle>Total Weight</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-6 text-sm">
                        <div className="space-y-1">
                            <p className="text-gray-600">Metric</p>
                            <p className="font-bold">{ledCalcData.weight.total_kg}</p>
                             {isMixed && (
                                <div className="text-xs text-gray-600 pt-2">
                                    <p>Full: {ledCalcData.weight.full_kg}</p>
                                    <p>Half: {ledCalcData.weight.half_kg}</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-600">Imperial</p>
                            <p className="font-bold">{ledCalcData.weight.total_lbs}</p>
                            {isMixed && (
                                <div className="text-xs text-gray-600 pt-2">
                                    <p>Full: {ledCalcData.weight.full_lbs}</p>
                                    <p>Half: {ledCalcData.weight.half_lbs}</p>
                                </div>
                            )}
                        </div>
                    </CardContent></Card></div>
                    <Card className="col-span-1 bg-white text-black"><CardHeader><CardTitle>Power Consumption</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-6 text-sm">
                        <div>
                            <p className="font-semibold mb-2">Power/m² (Max/Avg)</p>
                            <p className="font-bold">{ledCalcData.power.perSqmMax} / {ledCalcData.power.perSqmAvg}</p>
                        </div>
                        <div>
                            <p className="font-semibold mb-2">Total Power (Max/Avg)</p>
                            <p className="font-bold">{ledCalcData.power.totalMaxW} / {ledCalcData.power.totalAvgW}</p>
                            {isMixed && (
                                <div className="text-xs text-gray-600 pt-2 space-y-1">
                                    <p>Full: {ledCalcData.power.fullMaxW} / {ledCalcData.power.fullAvgW}</p>
                                    <p>Half: {ledCalcData.power.halfMaxW} / {ledCalcData.power.halfAvgW}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-semibold mb-2">Current @ {ledCalcData.voltage}V ({ledCalcData.phase})</p>
                            <p className="font-bold">{ledCalcData.power.maxAmps} / {ledCalcData.power.avgAmps}</p>
                        </div>
                    </CardContent></Card>
                </div>
            </div>

            <div id="power-data-pdf-export" className="p-8 bg-white text-black" style={{ width: '800px', fontFamily: 'var(--font-space-mono), monospace' }}>
                <div className="text-center mb-8"><h1 className="text-3xl font-bold">{state.projectName} - {activeScreen.name}</h1>{currentDate && <p className="text-gray-500">{currentDate}</p>}</div>
                <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-2 gap-6"><Card className="bg-white text-black"><CardHeader className="flex flex-row items-center gap-2"><Tv className="w-5 h-5" /><CardTitle>LED Product</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-6 text-sm"><div className="space-y-1"><p className="text-gray-600">Manufacturer</p><p className="font-bold">{activeScreen.ledManufacturer}</p></div><div className="space-y-1"><p className="text-gray-600">Product</p><p className="font-bold">{activeScreen.ledProduct}{isMixed ? ' (Mixed)' : ''}</p></div></CardContent></Card><Card className="bg-white text-black"><CardHeader className="flex flex-row items-center gap-2"><Monitor className="w-5 h-5" /><CardTitle>Screen Configuration</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-6 text-sm"><div className="space-y-1"><p className="text-gray-600">Total Panels</p><p className="font-bold">{powerData.totalPanels}</p></div><div className="space-y-1"><p className="text-gray-600">Total Pixels</p><p className="font-bold">{powerData.totalPixels.toLocaleString()}</p></div><div className="space-y-1"><p className="text-gray-600">Screen Resolution</p><p className="font-bold">{powerData.screenResolutionX} &times; {powerData.screenResolutionY} pixels</p></div><div className="space-y-1"><p className="text-gray-600">{state.power.processorType} Required</p><p className="font-bold">{powerData.totalProcessors} processor(s)</p></div></CardContent></Card></div>
                    <div className="grid grid-cols-2 gap-6"><Card className="bg-white text-black"><CardHeader className="flex flex-row items-center gap-2"><Cable className="w-5 h-5" /><CardTitle>Data Requirements</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-6 text-sm"><div className="space-y-1"><p className="text-gray-600">Panels per Port:</p><p className="font-bold">{powerData.panelsPerPort}</p></div><div className="space-y-1"><p className="text-gray-600">Total Ports Needed:</p><p className="font-bold">{powerData.totalPortsNeeded}</p></div></CardContent></Card><Card className="bg-white text-black"><CardHeader className="flex flex-row items-center gap-2"><Zap className="w-5 h-5" /><CardTitle>Power Requirements ({powerData.voltage}V {powerData.phase})</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-6 text-sm"><div className="space-y-1"><p className="text-gray-600">Panels per 20A Circuit:</p><p className="font-bold">{powerData.panelsPer20A_Circuit}</p></div><div className="space-y-1"><p className="text-gray-600">Total Circuits Needed:</p><p className="font-bold">{powerData.totalCircuitsNeeded}</p></div></CardContent></Card></div>
                </div>
            </div>

            <div id="pixel-map-export" className="relative" style={{ width: `${totalWidthPxExport}px`, height: `${totalHeightPxExport}px`, backgroundColor: borderColor, fontFamily: 'var(--font-space-mono), monospace' }}>
                <div className="flex flex-col" style={{ gap: `${ledTileBorderPx}px` }}>
                    {Array.from({ length: numRows }).map((_, r) => {
                        const isHalfH = isMixed && ledScreenHalfHeight > 0 && r === 0;
                        const rowHeight = isHalfH && halfProductData ? halfProductData.height_px : ledTileHeightPx;
                        return (
                            <div key={r} className="flex" style={{ gap: `${ledTileBorderPx}px`, height: `${rowHeight}px` }}>
                                {Array.from({ length: numCols }).map((_, c) => {
                                    const isEven = (r + c) % 2 === 0;
                                    let tileLabel: string | null = null;
                                    let tileWidth = ledTileWidthPx;
                                    if (isMixed && ledScreenHalfWidth > 0) {
                                        if (halfPanelPosition === 'left' && c === 0) tileWidth = halfProductData?.width_mm || ledTileWidthPx / 2;
                                        else if (halfPanelPosition === 'right' && c === numCols - 1) tileWidth = halfProductData?.width_mm || ledTileWidthPx / 2;
                                    }
                                    
                                    switch (tileNumbering) {
                                        case 'none': break;
                                        case 'sequential': tileLabel = (r * numCols + c + 1).toString(); break;
                                        case 'col-row': tileLabel = `${c + 1}-${r + 1}`; break;
                                        case 'row-col': const rowChar = String.fromCharCode(65 + r); tileLabel = `${rowChar}${c + 1}`; break;
                                    }
                                    return <div key={c} style={{ backgroundColor: isEven ? tileColor1 : tileColor2, width: `${tileWidth}px`, height: '100%' }} className="relative flex items-center justify-center">{tileNumbering !== 'none' && tileLabel !== null && <span className="font-bold" style={{ fontSize: `${tileNumberSize}px`, color: tileNumberColor, textShadow: '0 0 5px rgba(0,0,0,0.7)' }}>{tileLabel}</span>}</div>;
                                })}
                            </div>
                        );
                    })}
                </div>
                {showScalingOverlay && <div className="absolute inset-0 pointer-events-none"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2={totalWidthPxExport} y2={totalHeightPxExport} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" /><line x1={totalWidthPxExport} y1="0" x2="0" y2={totalHeightPxExport} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" /><circle cx={totalWidthPxExport / 2} cy={totalHeightPxExport / 2} r={Math.min(totalWidthPxExport, totalHeightPxExport) / 2} stroke="rgba(255, 255, 255, 0.5)" strokeWidth="2" fill="none" /></svg></div>}
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

            {activeRaster && activeRasterData && (
                <div id="raster-map-export" className="relative overflow-hidden" style={{ width: `${activeRasterData.canvasWidth}px`, height: `${activeRasterData.canvasHeight}px`, backgroundColor: activeRaster.backgroundColor, fontFamily: 'var(--font-space-mono), monospace' }}>
                    {activeRasterData.renderedScreens.map((screen: any) => {
                        if (!screen) return null;
            
                        const screenText = `${screen.name}\n${screen.screenWidthPx}x${screen.screenHeightPx}`;
                        const totalRowsExp = screen.ledScreenHeight + (screen.isMixed && screen.ledScreenHalfHeight > 0 ? 1 : 0);
                        const totalColsExp = screen.ledScreenWidth + (screen.isMixed && screen.ledScreenHalfWidth > 0 ? 1 : 0);
            
                        const screenContent = (
                            <div
                                className="absolute border border-dashed border-white/50"
                                style={{
                                    left: '0px', top: '0px',
                                    width: `${screen.screenWidthPx}px`, height: `${screen.screenHeightPx}px`,
                                    backgroundColor: screen.borderColor, display: 'flex', flexDirection: 'column',
                                    gap: `${screen.ledTileBorderPx}px`,
                                }}
                            >
                                {Array.from({ length: totalRowsExp }).map((_, r) => {
                                    const isHalfH = screen.isMixed && screen.ledScreenHalfHeight > 0 && r === 0;
                                    const rowHeight = isHalfH && screen.halfProduct ? screen.halfProduct.height_px : screen.ledTileHeightPx;
                                    return (
                                        <div key={r} className="flex" style={{ gap: `${screen.ledTileBorderPx}px`, height: `${rowHeight}px` }}>
                                            {Array.from({ length: totalColsExp }).map((_, c) => {
                                                const isEven = (r + c) % 2 === 0;
                                                let tileWidth = screen.ledTileWidthPx;
                                                if (screen.isMixed && screen.ledScreenHalfWidth > 0) {
                                                    if (screen.halfPanelPosition === 'left' && c === 0) tileWidth = screen.halfProduct?.width_px || screen.ledTileWidthPx / 2;
                                                    else if (screen.halfPanelPosition === 'right' && c === totalColsExp - 1) tileWidth = screen.halfProduct?.width_px || screen.ledTileWidthPx / 2;
                                                }
                                                return (
                                                    <div key={c} style={{ backgroundColor: isEven ? screen.tileColor1 : screen.tileColor2, width: `${tileWidth}px`, height: '100%' }} className="relative flex items-center justify-center">
                                                        {activeRaster.showTileLabels && <span className="font-bold" style={{ fontSize: `${screen.tileNumberSize}px`, color: screen.tileNumberColor, textShadow: '0 0 5px rgba(0,0,0,0.7)' }}>{getTileLabelExport(screen, r, c)}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                                {activeRaster.showScreenNames && <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none"><span style={{ fontSize: `${screen.nameFontSize}px`, textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }} className="text-white font-bold text-center break-words whitespace-pre-wrap">{screenText}</span></div>}
                            </div>
                        );

                        const processorWidth = activeRasterData.canvasWidth;
                        const processorHeight = activeRasterData.canvasHeight;
                        const sResX = screen.screenWidthPx;
                        const sResY = screen.screenHeightPx;
                        
                        let packingMode: 'none' | 'vertical' | 'horizontal' = 'none';
                        let strips = 1;

                        if (state.power.useSmartPacking) {
                            const canFitNormally = sResX <= processorWidth && sResY <= processorHeight;

                            if (!canFitNormally) {
                                const stripsForWidth = Math.ceil(sResX / processorWidth);
                                const hForWPacking = (stripsForWidth * sResY) + ((stripsForWidth - 1) * STRIP_GAP);
                                if (hForWPacking <= processorHeight) {
                                    packingMode = 'vertical';
                                    strips = stripsForWidth;
                                } else {
                                    const stripsForHeight = Math.ceil(sResY / processorHeight);
                                    const wForHPacking = (stripsForHeight * sResX) + ((stripsForHeight - 1) * STRIP_GAP);
                                    if (wForHPacking <= processorWidth) {
                                        packingMode = 'horizontal';
                                        strips = stripsForHeight;
                                    }
                                }
                            }
                        }

                        if (packingMode === 'none') {
                            return <div key={screen.id} className="absolute" style={{ left: `${screen.positionX}px`, top: `${screen.positionY}px` }}>{screenContent}</div>;
                        }
                        
                        return Array.from({ length: strips }).map((_, i) => {
                            let stripContainerStyle: React.CSSProperties = {};
                            let screenContentStyle: React.CSSProperties = {};
                            let stripPositionX = screen.positionX;
                            let stripPositionY = screen.positionY;

                            if (packingMode === 'vertical') {
                                stripPositionY += i * (sResY + STRIP_GAP);
                                stripContainerStyle = { position: 'absolute', left: `${screen.positionX}px`, top: `${stripPositionY}px`, width: `${processorWidth}px`, height: `${sResY}px`, overflow: 'hidden' };
                                screenContentStyle = { position: 'absolute', left: `-${i * processorWidth}px`, top: '0px' };
                            } else {
                                stripPositionX += i * (sResX + STRIP_GAP);
                                stripContainerStyle = { position: 'absolute', left: `${stripPositionX}px`, top: `${screen.positionY}px`, width: `${sResX}px`, height: `${processorHeight}px`, overflow: 'hidden' };
                                screenContentStyle = { position: 'absolute', left: '0px', top: `-${i * processorHeight}px` };
                            }

                            return <div key={`${screen.id}-strip-${i}`} style={stripContainerStyle}>
                                <div style={screenContentStyle}>{screenContent}</div>
                                {activeRaster.showCoordinates && (
                                    <div className="absolute top-0 left-0 bg-black/50 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-md pointer-events-none" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.8)' }}>
                                        ({stripPositionX}x, {stripPositionY}y)
                                    </div>
                                )}
                            </div>;
                        });
                    })}
                </div>
            )}


            <WiringDiagramExportContent wiringMode="data" id="data-wiring-diagram-export" />

            <WiringDiagramExportContent wiringMode="power" id="power-wiring-diagram-export" />
            
            <HardwareRequirementsExport />

            <MediaServerExport />

        </>
    );
}
