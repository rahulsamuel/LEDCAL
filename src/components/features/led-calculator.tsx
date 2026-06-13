'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Info, Copy, Download, Monitor, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';

const MM_TO_INCHES = 0.0393701;
const MM_TO_FEET = 0.00328084;
const KG_TO_LBS = 2.20462;

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

export default function LedCalculator() {
  const { getActiveScreen, state, powerAndDataCalculations, saveProject } = useProjectContext();
  const { calculator: calcState, ledProducts, activeProjectId } = state;
  const activeScreen = getActiveScreen();
  const { toast } = useToast();
  const { user } = useAuth();

  const isProductSelected = useMemo(() => 
    !!(activeScreen?.ledManufacturer && activeScreen?.ledProduct && activeScreen?.ledManufacturer !== 'Custom')
  , [activeScreen]);

  const isCustomProduct = useMemo(() => 
    activeScreen?.ledManufacturer === 'Custom'
  , [activeScreen]);

  const halfProductData = useMemo(() => 
    (activeScreen?.isMixed) ? ledProducts.find(p => p.manufacturer === activeScreen.ledManufacturer && p.name === activeScreen.ledHalfProduct) : undefined
  , [activeScreen, ledProducts]);

  const weightBreakdown = useMemo(() => {
    if (!activeScreen || !isProductSelected) return { full: 0, half: 0, total: 0 };
    const { totalFullPanels, totalHalfPanels } = powerAndDataCalculations;
    const fullWeight = totalFullPanels * activeScreen.panelWeight;
    const hWeight = halfProductData ? halfProductData.weight_kg : (activeScreen.panelWeight / 2);
    const halfWeight = totalHalfPanels * hWeight;
    return { full: fullWeight, half: halfWeight, total: fullWeight + halfWeight };
  }, [activeScreen, isProductSelected, halfProductData, powerAndDataCalculations]);

  const powerBreakdown = useMemo(() => {
    if (!activeScreen || !isProductSelected) return { fullMax: 0, fullAvg: 0, halfMax: 0, halfAvg: 0, totalMax: 0, totalAvg: 0 };
    const { totalFullPanels, totalHalfPanels } = powerAndDataCalculations;
    const fullMax = totalFullPanels * activeScreen.panelPowerMax;
    const fullAvg = totalFullPanels * activeScreen.panelPowerAvg;
    const hMax = halfProductData ? halfProductData.power_watts_max : (activeScreen.panelPowerMax / 2);
    const hAvg = halfProductData ? halfProductData.power_watts_avg : (activeScreen.panelPowerAvg / 2);
    const halfMax = totalHalfPanels * hMax;
    const halfAvg = totalHalfPanels * hAvg;
    return {
        fullMax, fullAvg,
        halfMax, halfAvg,
        totalMax: fullMax + halfMax,
        totalAvg: fullAvg + halfAvg
    };
  }, [activeScreen, isProductSelected, halfProductData, powerAndDataCalculations]);

  const tileString = useMemo(() => {
    if (!activeScreen) return '';
    const { ledScreenWidth, ledScreenHeight, isMixed, ledScreenHalfWidth, ledScreenHalfHeight } = activeScreen;
    const { totalPanels } = powerAndDataCalculations;
    const full = `${ledScreenWidth}x${ledScreenHeight}`;
    if (!isMixed) return `${full} tiles (${totalPanels} total)`;
    
    let halfStr = '';
    if (ledScreenHalfWidth > 0) halfStr = `${ledScreenHalfWidth}x${ledScreenHeight + ledScreenHalfHeight}`;
    else if (ledScreenHalfHeight > 0) halfStr = `${ledScreenWidth}x${ledScreenHalfHeight}`;
    
    return `Full: ${full} Half: ${halfStr} (${totalPanels} total)`;
  }, [activeScreen, powerAndDataCalculations]);

  const results = useMemo(() => {
    if (!activeScreen || !isProductSelected) return null;
    const { totalPanels, totalPixels, screenResolutionX, screenResolutionY } = powerAndDataCalculations;
    const { panelWidthMM, panelHeightMM } = activeScreen;

    const aspectRatioDivisor = gcd(screenResolutionX, screenResolutionY);
    const aspectX = screenResolutionX / aspectRatioDivisor;
    const aspectY = screenResolutionY / aspectRatioDivisor;
    const aspectDecimal = screenResolutionY > 0 ? screenResolutionX / screenResolutionY : 0;

    const totalWidthMM = (activeScreen.ledScreenWidth * panelWidthMM) + (activeScreen.isMixed && halfProductData ? activeScreen.ledScreenHalfWidth * halfProductData.width_mm : (activeScreen.isMixed && activeScreen.ledScreenHalfWidth > 0 ? activeScreen.ledScreenHalfWidth * (panelWidthMM / 2) : 0));
    const totalHeightMM = (activeScreen.ledScreenHeight * panelHeightMM) + (activeScreen.isMixed && halfProductData ? activeScreen.ledScreenHalfHeight * halfProductData.height_mm : (activeScreen.isMixed && activeScreen.ledScreenHalfHeight > 0 ? activeScreen.ledScreenHalfHeight * (panelHeightMM / 2) : 0));
    const totalAreaM2 = (totalWidthMM / 1000) * (totalHeightMM / 1000);

    const voltage = calcState.operatingVoltage;
    const isThreePhase = calcState.phaseConfiguration === 'three';
    const phaseDivisor = isThreePhase ? Math.sqrt(3) : 1;
    const totalMaxW = powerBreakdown?.totalMax || 0;
    const totalAvgW = powerBreakdown?.totalAvg || 0;
    const maxAmps = voltage > 0 ? totalMaxW / (voltage * phaseDivisor) : 0;
    const avgAmps = voltage > 0 ? totalAvgW / (voltage * phaseDivisor) : 0;

    const wPerSqmMax = totalAreaM2 > 0 ? totalMaxW / totalAreaM2 : 0;
    const wPerSqmAvg = totalAreaM2 > 0 ? totalAvgW / totalAreaM2 : 0;

    return {
        screenResolutionX, screenResolutionY, totalPixels, aspectX, aspectY, aspectDecimal,
        totalWidthMM, totalHeightMM, totalAreaM2, wPerSqmMax, wPerSqmAvg, totalMaxW, totalAvgW,
        maxAmps, avgAmps, voltage, isThreePhase
    };
  }, [activeScreen, isProductSelected, halfProductData, powerAndDataCalculations, calcState, powerBreakdown]);

  const handleCopy = () => {
    if (!results || !activeScreen) return;
    
    let copyText = `LED CALCULATOR TECHNICAL SPECIFICATIONS\n`;
    copyText += `Project: ${state.projectName}\n`;
    copyText += `Hardware: ${activeScreen.ledManufacturer} ${activeScreen.ledProduct}${activeScreen.isMixed ? ' (MIXED)' : ''}\n\n`;
    
    copyText += `[ SCREEN PROPERTIES ]\n`;
    copyText += `Resolution: ${results.screenResolutionX} × ${results.screenResolutionY} pixels\n`;
    copyText += `Total Pixels: ${results.totalPixels.toLocaleString()}\n`;
    copyText += `Tile Config: ${tileString}\n`;
    copyText += `Aspect Ratio: ${results.aspectX}:${results.aspectY} (${results.aspectDecimal.toFixed(2)}:1)\n\n`;
    
    copyText += `[ PHYSICAL DIMENSIONS ]\n`;
    copyText += `Metric: ${(results.totalWidthMM/1000).toFixed(2)}m × ${(results.totalHeightMM/1000).toFixed(2)}m (${results.totalWidthMM.toFixed(1)}mm × ${results.totalHeightMM.toFixed(1)}mm)\n`;
    copyText += `Imperial: ${toFeetAndFractionalInches(results.totalWidthMM * MM_TO_INCHES)} × ${toFeetAndFractionalInches(results.totalHeightMM * MM_TO_INCHES)}\n`;
    copyText += `Imperial (Decimal): ${(results.totalWidthMM * MM_TO_FEET).toFixed(2)}ft × ${(results.totalHeightMM * MM_TO_FEET).toFixed(2)}ft\n`;
    copyText += `Imperial (Inches): ${(results.totalWidthMM * MM_TO_INCHES).toFixed(1)}in × ${(results.totalHeightMM * MM_TO_INCHES).toFixed(1)}in\n\n`;
    
    copyText += `[ WEIGHT ]\n`;
    copyText += `Metric: ${weightBreakdown?.total.toFixed(1)} kg (Full: ${weightBreakdown?.full.toFixed(1)}kg, Half: ${weightBreakdown?.half.toFixed(1)}kg)\n`;
    copyText += `Imperial: ${(weightBreakdown!.total * KG_TO_LBS).toFixed(1)} lbs (Full: ${(weightBreakdown!.full * KG_TO_LBS).toFixed(1)}lbs, Half: ${(weightBreakdown!.half * KG_TO_LBS).toFixed(1)}lbs)\n\n`;
    
    copyText += `[ POWER CONSUMPTION ]\n`;
    copyText += `Voltage: ${results.voltage}V (${results.isThreePhase ? 'Three Phase' : 'Single Phase'})\n`;
    copyText += `Max Load: ${results.totalMaxW.toFixed(2)}W (${results.maxAmps.toFixed(2)}A)\n`;
    copyText += `Avg Load: ${results.totalAvgW.toFixed(2)}W (${results.avgAmps.toFixed(2)}A)\n`;
    copyText += `Density: ${results.wPerSqmMax.toFixed(0)} W/m² Max / ${results.wPerSqmAvg.toFixed(0)} W/m² Avg\n`;

    navigator.clipboard.writeText(copyText).then(() => {
        toast({ title: 'Full Technical Specs Copied!' });
    });
  };

  if (!activeScreen) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>LED Calculator</CardTitle>
                <CardDescription>Perform detailed technical analysis on your screen hardware.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Monitor className="h-4 w-4" />
                    <AlertTitle>No Screen Selected</AlertTitle>
                    <AlertDescription>
                        Please create or select a screen from the sidebar to view engineering data.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }

  if (isCustomProduct) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>LED Calculator</CardTitle>
                <CardDescription>Engineering specs for your custom hardware configuration.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Custom Product Selected</AlertTitle>
                    <AlertDescription>
                        Calculations cannot be performed for a 'Custom' product. Please select a specific model from the library to see metrics.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }

  if (!isProductSelected || !results) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>LED Calculator</CardTitle>
                <CardDescription>Technical analysis for the selected hardware model.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Product Selected</AlertTitle>
                    <AlertDescription>
                        Please select an LED Manufacturer and Product from the sidebar to generate specifications.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="w-full h-full space-y-6 overflow-auto font-mono">
      <Card className="bg-card border-border shadow-none overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-bold">Screen Resolution & Properties</CardTitle>
            {activeScreen.isMixed && (
                <Badge variant="default" className="font-black uppercase text-[10px] px-3 py-1">
                    (MIXED)
                </Badge>
            )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resolution</p>
            <p className="text-2xl font-bold">{results.screenResolutionX} × {results.screenResolutionY}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Pixels</p>
            <p className="text-2xl font-bold">{results.totalPixels.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tile Configuration</p>
            <p className="text-sm font-bold pt-1">{tileString}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aspect Ratio</p>
            <p className="text-2xl font-bold">{results.aspectX}:{results.aspectY} <span className="text-xs font-medium text-muted-foreground">({results.aspectDecimal.toFixed(2)}:1)</span></p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold">Physical Dimensions</CardTitle>
            <CardDescription className="text-[9px] uppercase font-black tracking-[0.2em] text-muted-foreground">Straight-line dimensions.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-12 gap-y-8">
            <div className="space-y-6">
                <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 border-b border-border pb-1">Metric (Total)</p>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1">Meters</p>
                            <p className="text-xl font-bold">{(results.totalWidthMM/1000).toFixed(2)} × {(results.totalHeightMM/1000).toFixed(2)} m</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1">Millimeters</p>
                            <p className="text-sm font-mono font-bold text-muted-foreground">{results.totalWidthMM.toFixed(1)} × {results.totalHeightMM.toFixed(1)} mm</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 border-b border-border pb-1">Imperial (Total)</p>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1">Feet / Inches</p>
                            <p className="text-xl font-bold">{toFeetAndFractionalInches(results.totalWidthMM * MM_TO_INCHES)} × {toFeetAndFractionalInches(results.totalHeightMM * MM_TO_INCHES)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mb-1">Decimal Feet</p>
                            <p className="text-sm font-mono font-bold text-muted-foreground">{(results.totalWidthMM * MM_TO_FEET).toFixed(2)} × {(results.totalHeightMM * MM_TO_FEET).toFixed(2)} ft</p>
                        </div>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold">Total Weight</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 border-b border-border pb-1">Metric (kg)</p>
                <p className="text-2xl font-black">{weightBreakdown?.total.toFixed(1)} <span className="text-sm text-muted-foreground font-bold">kg</span></p>
                {activeScreen.isMixed && (
                    <div className="text-[9px] font-black text-muted-foreground uppercase space-y-0.5 pt-2 opacity-70">
                        <p>Full: {weightBreakdown?.full.toFixed(1)} kg</p>
                        <p>Half: {weightBreakdown?.half.toFixed(1)} kg</p>
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 border-b border-border pb-1">Imperial (lbs)</p>
                <p className="text-2xl font-black">{(weightBreakdown!.total * KG_TO_LBS).toFixed(1)} <span className="text-sm text-muted-foreground font-bold">lbs</span></p>
                {activeScreen.isMixed && (
                    <div className="text-[9px] font-black text-muted-foreground uppercase space-y-0.5 pt-2 opacity-70">
                        <p>Full: {(weightBreakdown!.full * KG_TO_LBS).toFixed(1)} lbs</p>
                        <p>Half: {(weightBreakdown!.half * KG_TO_LBS).toFixed(1)} lbs</p>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold">Power Consumption</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 border-b border-border pb-1">Per Square Meter</p>
                <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Maximum</span>
                        <span className="text-2xl font-bold">{results.wPerSqmMax.toFixed(0)} <span className="text-xs text-muted-foreground">W/m²</span></span>
                    </div>
                    <div className="flex justify-between items-baseline opacity-60">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Average</span>
                        <span className="text-lg font-bold text-muted-foreground">{results.wPerSqmAvg.toFixed(0)} <span className="text-xs text-muted-foreground">W/m²</span></span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 border-b border-border pb-1">Total Power (W)</p>
                <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Maximum</span>
                        <span className="text-2xl font-bold">{results.totalMaxW.toFixed(0)} <span className="text-xs text-muted-foreground">Watts</span></span>
                    </div>
                    <div className="flex justify-between items-baseline opacity-60">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Average</span>
                        <span className="text-lg font-bold text-muted-foreground">{results.totalAvgW.toFixed(0)} <span className="text-xs text-muted-foreground">Watts</span></span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 border-b border-border pb-1">Current @ {results.voltage}V <span className="text-xs text-muted-foreground">({results.isThreePhase ? '3Ø' : '1Ø'})</span></p>
                <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Maximum</span>
                        <span className="text-2xl font-bold">{results.maxAmps.toFixed(2)} <span className="text-xs text-muted-foreground">Amps</span></span>
                    </div>
                    <div className="flex justify-between items-baseline opacity-60">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Average</span>
                        <span className="text-lg font-bold text-muted-foreground">{results.avgAmps.toFixed(2)} <span className="text-xs text-muted-foreground">Amps</span></span>
                    </div>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold">Export Results</CardTitle>
          <CardDescription className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Technical specification hand-off.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={handleCopy} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest rounded-lg shadow-lg">
            <Copy className="mr-2 h-4 w-4" /> Copy Full Technical Data
          </Button>
          <Button variant="outline" className="h-11 px-8 font-black uppercase text-[10px] tracking-widest border-border hover:bg-muted/5 text-muted-foreground rounded-lg">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          {user && (
            <Button onClick={saveProject} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg">
              <Save className="mr-2 h-4 w-4" /> {activeProjectId ? 'Update Cloud Project' : 'Save to Cloud'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
