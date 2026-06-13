
'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, Download, AlertTriangle, Monitor, Info } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const resolutionPresets = {
  '1080p': { width: 1920, height: 1080 },
  '4K UHD': { width: 3840, height: 2160 },
  'DCI 4K': { width: 4096, height: 2160 },
};

export default function MediaServerRequirements() {
  const { state, powerAndDataCalculations } = useProjectContext();
  const { rasters, mediaServer, pixelMaps, mediaServers } = state;
  const { totalProcessors } = powerAndDataCalculations;
  const { toast } = useToast();

  const selectedServer = mediaServers.find(s => s.id === mediaServer.selectedServerId);
  const isAnyScreenConfigured = pixelMaps.some(p => p.ledScreenWidth > 0 && (p.ledScreenHeight > 0 || p.ledScreenHalfHeight > 0) && p.ledManufacturer && p.ledProduct && p.ledManufacturer !== 'Custom');


  const totalResolution = rasters.reduce((acc, raster) => {
    const screensOnRaster = Object.keys(raster.screenAssignments)
        .filter(screenId => raster.screenAssignments[screenId])
        .map(screenId => {
            const screen = pixelMaps.find(p => p.id === screenId);
            const setting = raster.screenSettings.find(s => s.screenId === screenId);
            if (!screen || !setting) return null;
            
            const halfProduct = screen.isMixed ? state.ledProducts.find(p => p.name === screen.ledHalfProduct && p.manufacturer === screen.ledManufacturer) : undefined;
            
            let totalWidthPx = screen.ledScreenWidth * screen.ledTileWidthPx;
            if (screen.isMixed && screen.ledScreenHalfWidth > 0 && halfProduct) {
                totalWidthPx += screen.ledScreenHalfWidth * halfProduct.width_px;
            }
            
            let totalHeightPx = screen.ledScreenHeight * screen.ledTileHeightPx;
            if (screen.isMixed && screen.ledScreenHalfHeight > 0 && halfProduct) {
                totalHeightPx += screen.ledScreenHalfHeight * halfProduct.height_px;
            }

            return {
                x: setting.positionX,
                y: setting.positionY,
                width: totalWidthPx,
                height: totalHeightPx,
            };
        }).filter(Boolean);

    if (screensOnRaster.length > 0) {
      const minX = Math.min(...screensOnRaster.map(s => s!.x));
      const minY = Math.min(...screensOnRaster.map(s => s!.y));
      const maxX = Math.max(...screensOnRaster.map(s => s!.x + s!.width));
      const maxY = Math.max(...screensOnRaster.map(s => s!.y + s!.height));
      
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      
      return {
          width: Math.max(acc.width, contentWidth),
          height: acc.height + contentHeight, 
      };
    }
    
    return acc;
  }, { width: 0, height: 0 });

  const numOutputs = totalProcessors;

  const serverOutputs = selectedServer ? (typeof selectedServer.outputs === 'number' ? selectedServer.outputs : parseInt(selectedServer.outputs as string) || 1) : 1;

  const primaryServersNeeded = Math.ceil(numOutputs / (serverOutputs || 1));

  const totalServersNeeded = mediaServer.useBackupServer ? primaryServersNeeded * 2 : primaryServersNeeded;
  
  const handleDownload = async () => {
    const element = document.getElementById('media-server-pdf-export');
    if (!element) return;

    try {
      const { default: jsPDF } = await import('jspdf');
      const dataUrl = await toPng(element, { quality: 0.95 });
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${state.projectName.replace(/\s+/g, '_')}_Media_Server_Requirements.pdf`);
      toast({ title: 'Download Successful', description: 'PDF report has been generated.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate the PDF report.' });
    }
  };


  if (!isAnyScreenConfigured) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Media Server Planner</CardTitle>
                <CardDescription>Recommended playback setup for your high-resolution project.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Screens Configured</AlertTitle>
                    <AlertDescription>
                        Please go to the "Pixel Map" tab and configure at least one screen with a valid hardware product before using the Media Server planner.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      <Card className="bg-card border-border shadow-none">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Media Server & Playback Requirements</CardTitle>
            <CardDescription>Recommended setup based on your project's total resolution and outputs.</CardDescription>
          </div>
          <Button onClick={handleDownload} variant="outline" className="border-border">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Total Resolution</p>
              <p className="font-bold text-lg">{totalResolution.width} x {totalResolution.height} px</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Outputs Required</p>
              <p className="font-bold text-lg">{numOutputs}</p>
            </div>
             <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Selected Server</p>
              <p className="font-bold text-lg">{selectedServer?.name || 'Not Selected'}</p>
            </div>
             <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Servers Required</p>
              <p className="font-bold text-lg">{totalServersNeeded}</p>
              {mediaServer.useBackupServer && <p className="text-[10px] text-muted-foreground uppercase font-bold">({primaryServersNeeded} Main + {primaryServersNeeded} Backup) </p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedServer && selectedServer.id !== 'custom' && (
        <Card className="bg-card border-border shadow-none">
          <CardHeader>
            <CardTitle>{selectedServer.name} Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow className="border-border/50">
                  <TableCell className="font-medium">Max Outputs</TableCell>
                  <TableCell>{selectedServer.outputs}</TableCell>
                </TableRow>
                <TableRow className="border-border/50">
                  <TableCell className="font-medium">Max Resolution per Output</TableCell>
                  <TableCell>{selectedServer.maxResolution}</TableCell>
                </TableRow>
                <TableRow className="border-border/50">
                  <TableCell className="font-medium">Recommended Video Codecs</TableCell>
                  <TableCell>{selectedServer.codecs.join(', ')}</TableCell>
                </TableRow>
                <TableRow className="border-border/50">
                  <TableCell className="font-medium">Audio Format</TableCell>
                  <TableCell>{selectedServer.audio}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedServer && numOutputs > serverOutputs && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="uppercase font-black text-[10px] tracking-widest">Output Warning</AlertTitle>
          <AlertDescription className="text-sm">
            The number of required outputs ({numOutputs}) exceeds the maximum outputs ({serverOutputs}) of the selected media server. You may need multiple servers.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
