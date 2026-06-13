'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Info, Copy, Construction } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

const KG_TO_LBS = 2.20462;

const FramePreview = ({ width, height, frames }: { width: number, height: number, frames: { [key: string]: number } }) => {
    const frameColors: { [key: string]: string } = {
        '3x2': 'bg-red-500/70',
        '2x2': 'bg-green-500/70',
        '2x1': 'bg-yellow-500/70',
        '1x2': 'bg-blue-500/70',
        '1x1': 'bg-purple-500/70',
    };

    const frameOrder = ['3x2', '2x2', '2x1', '1x2', '1x1'];
    
    let layout: { name: string, x: number, y: number, w: number, h: number }[] = [];
    let currentX = 0;
    let currentY = 0;

    let tempFrames = { ...frames };

    while (currentY < height) {
        while (currentX < width) {
            let placed = false;
            for (const frameName of frameOrder) {
                const [frameW, frameH] = frameName.split('x').map(Number);
                if (tempFrames[frameName] > 0 && currentX + frameW <= width && currentY + frameH <= height) {
                    let canPlace = true;
                    // Check if area is already occupied
                    for (let item of layout) {
                        if (currentX < item.x + item.w && currentX + frameW > item.x && currentY < item.y + item.h && currentY + frameH > item.y) {
                            canPlace = false;
                            break;
                        }
                    }

                    if (canPlace) {
                        layout.push({ name: frameName, x: currentX, y: currentY, w: frameW, h: frameH });
                        tempFrames[frameName]--;
                        currentX += frameW;
                        placed = true;
                        break;
                    }
                }
            }
            if (!placed) {
                // Could not place any frame, move to next position to avoid infinite loop
                currentX++;
            }
        }
        currentX = 0;
        currentY++;
    }


    if (layout.length === 0) return null;

    return (
        <div className="mt-4">
            <h4 className="font-semibold mb-2">Frame Layout Preview</h4>
            <div
                className="relative bg-muted/20 border rounded-md p-2"
                style={{
                    width: '100%',
                    paddingBottom: `${(height / width) * 100}%`, // Maintain aspect ratio
                }}
            >
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${width}, 1fr)`, gridTemplateRows: `repeat(${height}, 1fr)` }}>
                    {layout.map((item, index) => (
                        <div
                            key={index}
                            className={`flex items-center justify-center border border-background/50 ${frameColors[item.name]}`}
                            style={{
                                gridColumn: `${item.x + 1} / span ${item.w}`,
                                gridRow: `${item.y + 1} / span ${item.h}`,
                            }}
                        >
                            <span className="text-white text-xs font-bold">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                {Object.entries(frameColors).map(([name, color]) => {
                    if (frames[name] > 0) {
                        return (
                            <div key={name} className="flex items-center gap-1.5">
                                <div className={`w-3 h-3 rounded-sm ${color} border border-background/50`}></div>
                                <span>{name}</span>
                            </div>
                        )
                    }
                    return null;
                })}
            </div>
        </div>
    );
};


export default function HardwareRequirements() {
  const { state, getActiveScreen } = useProjectContext();
  const { ledProducts } = state;
  const activeScreen = getActiveScreen();
  const { toast } = useToast();

  const totalWeightLbs = useMemo(() => {
      if (!activeScreen) return 0;
      const { ledScreenWidth, ledScreenHeight, isMixed, ledScreenHalfWidth, ledScreenHalfHeight, ledHalfProduct, panelWeight, ledProduct, ledManufacturer } = activeScreen;
      
      const fullPanelsCount = ledScreenWidth * ledScreenHeight;
      let halfPanelsCount = 0;
      let halfPanelWeight = 0;

      if (isMixed) {
          const halfProductData = ledProducts.find(p => p.name === ledHalfProduct && p.manufacturer === ledManufacturer);
          if (halfProductData) {
              halfPanelsCount = (ledScreenHalfWidth * (ledScreenHeight + (ledScreenHalfHeight > 0 ? 1 : 0))) + (ledScreenWidth * ledScreenHalfHeight);
              halfPanelWeight = halfProductData.weight_kg;
          }
      }

      const totalWeightKg = (fullPanelsCount * panelWeight) + (halfPanelsCount * halfPanelWeight);
      return totalWeightKg * KG_TO_LBS;
  }, [activeScreen, ledProducts]);


  if (!activeScreen) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Hardware Requirements</CardTitle>
                <CardDescription>Select a screen to see hardware requirements.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Construction className="h-4 w-4" />
                    <AlertTitle>No Screen Selected</AlertTitle>
                    <AlertDescription>
                        Please select a screen from the sidebar to view hardware requirements.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
  }

  const { ledScreenWidth, ledScreenHeight, panelHeightMM, mountingType, ledManufacturer, ledProduct, sandbagWeight, cornerBlock, isMixed, ledScreenHalfWidth, ledScreenHalfHeight } = activeScreen;

  const isProductSelected = !!(ledManufacturer && (ledProduct || ledManufacturer === 'Custom'));
  
  const selectedProduct = isProductSelected 
    ? ledProducts.find(p => p.name === ledProduct && p.manufacturer === ledManufacturer)
    : undefined;

  if (!isProductSelected || !selectedProduct) {
     return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Hardware Requirements</CardTitle>
                <CardDescription>Select a product to see hardware requirements.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Product Selected</AlertTitle>
                    <AlertDescription>
                        Please select an LED Manufacturer and Product from the sidebar to view hardware requirements.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
  }
  
  let mountingWarning = null;
  const totalHeightTiles = ledScreenHeight + (isMixed && ledScreenHalfHeight > 0 ? 1 : 0);
  if (mountingType === 'flown' && selectedProduct.max_tiles_flown > 0 && totalHeightTiles > selectedProduct.max_tiles_flown) {
      mountingWarning = `Warning: Screen height of ${totalHeightTiles} tiles exceeds the manufacturer's recommended limit of ${selectedProduct.max_tiles_flown} for a flown configuration.`;
  } else if (mountingType === 'ground-stack' && selectedProduct.max_tiles_ground > 0 && totalHeightTiles > selectedProduct.max_tiles_ground) {
      mountingWarning = `Warning: Screen height of ${totalHeightTiles} tiles exceeds the manufacturer's recommended limit of ${selectedProduct.max_tiles_ground} for a ground-stack configuration.`;
  }

  let hardwareList: { name: string, quantity: number }[] = [];
  let floorFrames: { [key: string]: number } = {};

  if (mountingType === 'flown' && (ledScreenWidth + ledScreenHalfWidth) > 0) {
      const totalWidthInPanels = ledScreenWidth + ledScreenHalfWidth;
      const doubleWideBars = Math.floor(totalWidthInPanels / 2);
      const singleWideBars = totalWidthInPanels % 2;

      if (doubleWideBars > 0) hardwareList.push({ name: 'Header Bar Double Wide', quantity: doubleWideBars });
      if (singleWideBars > 0) hardwareList.push({ name: 'Header Bar Single Wide', quantity: singleWideBars });
  }

  if (mountingType === 'ground-stack' && (ledScreenWidth + ledScreenHalfWidth) > 0 && (ledScreenHeight + ledScreenHalfHeight) > 0) {
      const totalWidthInPanels = ledScreenWidth + ledScreenHalfWidth;
      const doubleWideBars = Math.floor(totalWidthInPanels / 2);
      const singleWideBars = totalWidthInPanels % 2;

      if (doubleWideBars > 0) hardwareList.push({ name: 'Double wide stacking bar', quantity: doubleWideBars });
      if (singleWideBars > 0) hardwareList.push({ name: 'Single wide stacking bar', quantity: singleWideBars });
      
      const totalStackingBars = doubleWideBars + singleWideBars;
      if (totalStackingBars > 0) {
        hardwareList.push({ name: 'Outriggers', quantity: totalStackingBars });
        
        const screenHeightInMeters = ((ledScreenHeight * panelHeightMM) + (isMixed && ledScreenHalfHeight > 0 ? (selectedProduct.height_mm / 2) : 0)) / 1000;
        const oneMeterTrussesPerStack = Math.floor(screenHeightInMeters);
        const halfMeterTrussesPerStack = (screenHeightInMeters % 1) > 0 ? 1 : 0;
        
        const totalOneMeterTrusses = totalStackingBars * oneMeterTrussesPerStack;
        const totalHalfMeterTrusses = totalStackingBars * halfMeterTrussesPerStack;
        
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
      let w = ledScreenWidth;
      let h = ledScreenHeight;
      const frames = { '3x2': 0, '2x2': 0, '2x1': 0, '1x2': 0, '1x1': 0 };

      // Start with the largest frames and tile them
      frames['3x2'] = Math.floor(w / 3) * Math.floor(h / 2);
      let remainingWafter3x2 = w % 3;
      let remainingHafter3x2 = h % 2;
      
      // Area covered by 3x2s
      let coveredW = w - remainingWafter3x2;

      // Fill the right-hand strip (width = remainingWafter3x2, height = h)
      let tempH = h;
      frames['2x2'] += Math.floor(remainingWafter3x2 / 2) * Math.floor(tempH / 2);
      frames['2x1'] += Math.floor(remainingWafter3x2 / 2) * (tempH % 2);
      
      let tempW = remainingWafter3x2 % 2;
      frames['1x2'] += tempW * Math.floor(tempH / 2);
      frames['1x1'] += tempW * (tempH % 2);

      // Fill the bottom strip (width = coveredW, height = remainingHafter3x2)
      tempW = coveredW;
      frames['2x1'] += Math.floor(tempW / 2) * remainingHafter3x2;
      frames['1x1'] += (tempW % 2) * remainingHafter3x2;
      
      floorFrames = frames;
      hardwareList = Object.entries(frames)
          .filter(([, quantity]) => quantity > 0)
          .map(([name, quantity]) => ({ name: `${name} Frame`, quantity }));
  }
  
  if (mountingType !== 'floor' && cornerBlock && (ledScreenWidth + ledScreenHalfWidth) > 0 && (ledScreenHeight + ledScreenHalfHeight) > 0) {
    const C = ledScreenWidth + ledScreenHalfWidth;
    const R = ledScreenHeight + ledScreenHalfHeight;

    if (C > 1 && R > 1) {
        // Simple grid assumption for blocks: every intersection needs a 4-way, and edges need 2-ways
        let fourWayConnectors = (C - 1) * (R - 1);
        
        if (fourWayConnectors > 0) {
            hardwareList.push({ name: '4-Way Connector/Block', quantity: fourWayConnectors });
        }
        
        // Perimeter blocks
        const twoWayConnectors = (((R - 1) * 2) + 2) + (C - 1);
        if (twoWayConnectors > 0) {
            hardwareList.push({ name: '2-Way Connector/Block', quantity: twoWayConnectors });
        }
    }
}

  
  const handleCopy = () => {
    let copyText = `Hardware Requirements for ${activeScreen.name} (${mountingType}):\n\n`;

    if (hardwareList.length > 0) {
        hardwareList.forEach(item => {
            copyText += `${item.name}: ${item.quantity}\n`;
        });
    } else {
        copyText += 'No specific hardware requirements for the current configuration.\n';
    }
    
    if (mountingWarning) {
        copyText += `\n!!! ${mountingWarning} !!!\n`;
    }

    navigator.clipboard.writeText(copyText).then(() => {
        toast({
            title: 'Results Copied!',
            description: 'All hardware requirements have been copied to your clipboard.',
        });
    }, (err) => {
        toast({
            variant: 'destructive',
            title: 'Copy Failed',
            description: 'Could not copy results to clipboard.',
        });
        console.error('Could not copy text: ', err);
    });
  };

  const isCopyDisabled = hardwareList.length === 0;

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                <div className="space-y-1">
                    <CardTitle>Hardware Requirements</CardTitle>
                    <CardDescription>
                        A list of suggested hardware for your screen configuration.
                    </CardDescription>
                </div>
                {activeScreen.isMixed && (
                    <Badge variant="default" className="font-black uppercase text-[9px] h-5 px-2">
                        (MIXED)
                    </Badge>
                )}
            </CardHeader>
            <CardContent>
                {mountingWarning && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Configuration Warning</AlertTitle>
                    <AlertDescription>{mountingWarning}</AlertDescription>
                  </Alert>
                )}
                {hardwareList.length > 0 ? (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {hardwareList.map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {mountingType === 'floor' && <FramePreview width={ledScreenWidth} height={ledScreenHeight} frames={floorFrames} />}
                    </>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No specific hardware requirements for the current configuration.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Export Results</CardTitle>
                <CardDescription>Copy all hardware requirements to your clipboard as formatted text.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleCopy} disabled={isCopyDisabled}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
