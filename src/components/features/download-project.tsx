

'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileArchive, Loader2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { toPng } from 'html-to-image';

const resolutionPresets = {
  '1080p': { width: 1920, height: 1080 },
  '4K UHD': { width: 3840, height: 2160 },
  'DCI 4K': { width: 4096, height: 2160 },
};

export function DownloadProject() {
  const { state, getActiveScreen, getActiveRaster } = useProjectContext();
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const activeScreen = getActiveScreen();
  const activeRaster = getActiveRaster();

  const isLedCalcReady = !!activeScreen && !!(activeScreen.ledManufacturer && (activeScreen.ledProduct || activeScreen.ledManufacturer === 'Custom')) && activeScreen.ledManufacturer !== 'Custom';
  const isPowerDataReady = isLedCalcReady;
  const isPixelMapReady = !!activeScreen && (activeScreen.ledScreenWidth * activeScreen.ledScreenHeight > 0) && !!(activeScreen.ledManufacturer && (activeScreen.ledProduct || activeScreen.ledManufacturer === 'Custom'));
  const isRasterMapReady = !!activeRaster && (activeRaster.resolutionPreset === 'Custom' ? (activeRaster.customWidth > 0 && activeRaster.customHeight > 0) : true) && state.pixelMaps.some(p => p.ledManufacturer && (p.ledProduct || p.ledManufacturer === 'Custom'));
  const isWiringReady = isPixelMapReady && (activeScreen.ledScreenWidth * activeScreen.ledScreenHeight <= 1000);
  const isHardwareReady = isLedCalcReady;

  const canDownload = isLedCalcReady && isPowerDataReady && isPixelMapReady && isRasterMapReady && isWiringReady && isHardwareReady;

  const generateFile = async (selector: string, type: 'png' | 'pdf', options: any = {}) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) throw new Error(`Element ${selector} not found`);

    if (type === 'png') {
        return toPng(element, { cacheBust: true, pixelRatio: 1, ...options })
            .then(dataUrl => fetch(dataUrl).then(res => res.blob()));
    } else { // pdf
        const { default: jsPDF } = await import('jspdf');
        const dataUrl = await toPng(element, { quality: 0.95 });
        const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(dataUrl);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }
        return pdf.output('blob');
    }
  };


  const handleDownload = async () => {
    if (!canDownload || !activeRaster) {
      toast({
        variant: 'destructive',
        title: 'Download Not Ready',
        description: 'Please ensure all tabs have valid results before downloading.',
      });
      return;
    }

    setIsDownloading(true);
    toast({
      title: 'Preparing Download',
      description: 'Generating and zipping files... please wait.',
    });

    try {
      const zip = new JSZip();
      
      const canvasWidth = activeRaster.resolutionPreset === 'Custom' ? activeRaster.customWidth : resolutionPresets[activeRaster.resolutionPreset].width;
      const canvasHeight = activeRaster.resolutionPreset === 'Custom' ? activeRaster.customHeight : resolutionPresets[activeRaster.resolutionPreset].height;

      // 1. LED Calculator PDF
      const ledCalcBlob = await generateFile('#led-calc-pdf-export', 'pdf');
      zip.file('LED_Calculator.pdf', ledCalcBlob);
      
      // 2. Power & Data PDF
      const powerDataBlob = await generateFile('#power-data-pdf-export', 'pdf');
      zip.file('Power_Data_Report.pdf', powerDataBlob);
      
      // 3. Pixel Map PNG
      const pixelMapBlob = await generateFile('#pixel-map-export', 'png', { backgroundColor: '#1E3A8A' });
      zip.file('Pixel_Map.png', pixelMapBlob);

      // 4. Raster Map PNG
      const rasterMapBlob = await generateFile('#raster-map-export', 'png', {
        backgroundColor: activeRaster?.backgroundColor,
        width: canvasWidth,
        height: canvasHeight,
      });
      zip.file('Raster_Map.png', rasterMapBlob);
      
      // 5. Data Wiring Diagram PNG
      const dataWiringBlob = await generateFile('#data-wiring-diagram-export', 'png', { backgroundColor: '#111827' });
      zip.file('Data_Wiring_Diagram.png', dataWiringBlob);

      // 6. Power Wiring Diagram PNG
      const powerWiringBlob = await generateFile('#power-wiring-diagram-export', 'png', { backgroundColor: '#111827' });
      zip.file('Power_Wiring_Diagram.png', powerWiringBlob);
      
      // 7. Hardware Requirements PDF
      const hardwareReqBlob = await generateFile('#hardware-req-pdf-export', 'pdf');
      zip.file('Hardware_Requirements.pdf', hardwareReqBlob);


      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.projectName.replace(/\s/g, '_')}_Project.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Successful',
        description: 'Your project zip file has been downloaded.',
      });
    } catch (error: any) {
      console.error('Failed to create project zip:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: error.message || 'An unexpected error occurred while creating the zip file.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Full Project</CardTitle>
        <CardDescription>
          Export all generated reports and diagrams into a single zip file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canDownload && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot Download Project</AlertTitle>
            <AlertDescription>
              Please ensure all of the following tabs have valid configurations and results before downloading the project:
              <ul className="list-disc pl-5 mt-2 text-xs">
                {!isLedCalcReady && <li>LED Calculator: A specific product must be selected for the active screen.</li>}
                {!isPowerDataReady && <li>Power & Data: A specific product must be selected for the active screen.</li>}
                {!isPixelMapReady && <li>Pixel Map: The active screen must have a valid size and product selected.</li>}
                {!isRasterMapReady && <li>Raster Map: The active raster must have a valid canvas size.</li>}
                {!isWiringReady && <li>Wiring Diagram: The active screen must have a valid configuration with 1000 or fewer panels.</li>}
                {!isHardwareReady && <li>Hardware Requirements: A specific product must be selected for the active screen.</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <Button onClick={handleDownload} disabled={!canDownload || isDownloading} className="mt-4">
          {isDownloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileArchive className="mr-2 h-4 w-4" />
          )}
          Download Project as .zip
        </Button>
      </CardContent>
    </Card>
  );
}
