
'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Monitor, Zap, Cable, AlertTriangle, Copy, Box, Layers, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';

export default function PowerDataCalculator() {
  const { state, powerAndDataCalculations, getActiveScreen, saveProject } = useProjectContext();
  const { power: powerState, processors, activeProjectId } = state;
  const activeScreen = getActiveScreen();
  const { toast } = useToast();
  const { user } = useAuth();
  
  if (!activeScreen) {
     return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Power & Data Calculator</CardTitle>
                <CardDescription>Signal path and power load analysis for the project.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Monitor className="h-4 w-4" />
                    <AlertTitle>No Screen Selected</AlertTitle>
                    <AlertDescription>Please select or create a screen from the sidebar to compute power and data flow requirements.</AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
  }

  const { ledManufacturer, ledProduct } = activeScreen;
  const isProductSelected = !!(ledManufacturer && (ledProduct || ledManufacturer === 'Custom'));
  const isCustomProduct = ledManufacturer === 'Custom';

  const { 
    totalPanels, totalPixels, screenResolutionX, screenResolutionY, 
    panelsPerPort, totalPortsNeeded, totalProcessors, xdBoxCount, heliosSwitchCount, 
    voltage, phase, panelsPer20A_Circuit, totalCircuitsNeeded 
  } = powerAndDataCalculations;

  const selectedProcessor = processors.find(p => p.id === powerState.processorType);
  const processorDisplayName = selectedProcessor ? `${selectedProcessor.manufacturer} ${selectedProcessor.name}` : 'Processor';

  if (isCustomProduct || !isProductSelected) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Power & Data Calculator</CardTitle>
                <CardDescription>Engineering analysis for the project signal distribution.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{isCustomProduct ? 'Custom Product' : 'No Product'} Selected</AlertTitle>
                    <AlertDescription>Please select a specific hardware product from the library to see detailed distribution and circuit requirements.</AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
  }
  
  const handleCopy = () => {
    let copyText = `POWER & DATA TECHNICAL SPECIFICATIONS\n`;
    copyText += `Project: ${state.projectName}\n`;
    copyText += `Screen: ${activeScreen.name}\n`;
    copyText += `Hardware: ${activeScreen.ledManufacturer} ${activeScreen.ledProduct}${activeScreen.isMixed ? ' (MIXED)' : ''}\n\n`;
    
    copyText += `[ SCREEN CONFIGURATION ]\n`;
    copyText += `Total Panels: ${totalPanels}\n`;
    copyText += `Total Pixels: ${totalPixels.toLocaleString()}\n`;
    copyText += `Resolution: ${screenResolutionX} x ${screenResolutionY} pixels\n\n`;
    
    copyText += `[ SIGNAL DISTRIBUTION ]\n`;
    copyText += `Processors: ${totalProcessors}x ${processorDisplayName}${powerState.useBackupProcessor ? ' (Main + Backup)' : ''}\n`;
    if (xdBoxCount > 0) copyText += `XD Boxes: ${xdBoxCount}x\n`;
    if (heliosSwitchCount > 0) copyText += `Helios Switches: ${heliosSwitchCount}x\n`;
    copyText += `Panels per Port: ${panelsPerPort}\n`;
    copyText += `Total Ports Needed: ${totalPortsNeeded}\n\n`;
    
    copyText += `[ ELECTRICAL REQUIREMENTS ]\n`;
    copyText += `Operating Voltage: ${voltage}V (${phase})\n`;
    copyText += `Panels per 20A Circuit: ${panelsPer20A_Circuit}\n`;
    copyText += `Total Circuits Needed: ${totalCircuitsNeeded}\n`;

    navigator.clipboard.writeText(copyText).then(() => {
        toast({ title: 'Technical Data Copied!', description: 'Full Power & Data report is now on your clipboard.' });
    });
  };

  return (
    <div className="w-full h-full space-y-6 overflow-auto font-mono bg-background">
        <Card className="bg-card border-border shadow-none overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
                <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-xl font-bold uppercase tracking-tight">Screen Configuration ({activeScreen.name})</CardTitle>
                </div>
                {activeScreen.isMixed && (
                    <Badge variant="default" className="font-black uppercase text-[10px] px-3 py-1">
                        (MIXED)
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="space-y-10">
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Panels</p>
                        <p className="text-2xl font-black">{totalPanels}</p>
                    </div>
                    <div className="space-y-1 text-right md:text-left">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Pixels</p>
                        <p className="text-2xl font-black">{totalPixels.toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Resolution</p>
                    <p className="text-2xl font-black tracking-tighter">
                        {screenResolutionX} × {screenResolutionY} <span className="text-primary font-black">pixels</span>
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-x-12 gap-y-6 pt-8 border-t border-border">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{processorDisplayName.toUpperCase()} Required</p>
                        <p className="text-2xl font-bold text-blue-400 flex items-center gap-2 leading-none">
                            <Layers className="w-5 h-5" />
                            {totalProcessors} <span className="text-[10px] font-bold text-muted-foreground uppercase">unit(s)</span>
                        </p>
                    </div>
                    
                    {xdBoxCount > 0 && (
                        <div className="space-y-2 animate-in zoom-in-95 duration-200">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">XD Boxes Required</p>
                            <p className="text-2xl font-bold text-blue-400 flex items-center gap-2 leading-none">
                                <Box className="w-5 h-5" />
                                {xdBoxCount} <span className="text-[10px] font-bold text-muted-foreground uppercase">unit(s)</span>
                            </p>
                        </div>
                    )}

                    {heliosSwitchCount > 0 && (
                        <div className="space-y-2 animate-in zoom-in-95 duration-200">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Helios Switches Required</p>
                            <p className="text-2xl font-bold text-purple-400 flex items-center gap-2 leading-none">
                                <Box className="w-5 h-5" />
                                {heliosSwitchCount} <span className="text-[10px] font-bold text-muted-foreground uppercase">unit(s)</span>
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-border shadow-none">
                <CardHeader className="flex flex-row items-center gap-2 pb-4">
                    <Cable className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg font-bold uppercase tracking-wider">Data Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Panels per Port</span>
                        <span className="text-2xl font-bold">{panelsPerPort}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Ports Required</span>
                        <span className="text-2xl font-bold">{totalPortsNeeded}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-none">
                <CardHeader className="flex flex-row items-center gap-2 pb-4">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg font-bold uppercase tracking-wider">Power Requirements ({voltage}V {phase})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-border">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Panels per 20A Circuit</span>
                        <span className="text-2xl font-bold">{panelsPer20A_Circuit}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Circuits Needed</span>
                        <span className="text-2xl font-bold">{totalCircuitsNeeded}</span>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card className="bg-card border-border shadow-none">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold uppercase tracking-wider">Export Results</CardTitle>
                <CardDescription className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Technical specification hand-off.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
                <Button onClick={handleCopy} className="bg-primary hover:bg-primary/90 h-11 px-10 font-black uppercase text-[10px] tracking-widest rounded-lg shadow-lg">
                    <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
                </Button>
                {user && (
                    <Button onClick={saveProject} className="h-11 px-10 font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-lg">
                        <Save className="mr-2 h-4 w-4" /> {activeProjectId ? 'Update Cloud Project' : 'Save to Cloud'}
                    </Button>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
