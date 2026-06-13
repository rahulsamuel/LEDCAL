'use client';

import { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectProvider, useProjectContext } from '@/contexts/project-context';
import Header from '@/components/layout/header';
import SettingsPanel from '@/components/layout/settings-panel';
import PowerDataCalculator from '@/components/features/power-data-calculator';
import PixelMapGenerator from '@/components/features/pixel-map-generator';
import WiringDiagram from '@/components/features/wiring-diagram';
import RasterMapGenerator from '@/components/features/raster-map-generator';
import ProductFinder from '@/components/features/product-finder';
import GettingStarted from '@/components/features/getting-started';
import LedCalculator from '@/components/features/led-calculator';
import ProductLibrary from '@/components/features/product-library';
import ProcessorLibrary from '@/components/features/processor-library';
import HardwareRequirements from '@/components/features/hardware-requirements';
import { ProjectExport } from '@/components/features/project-export';
import MediaServerRequirements from '@/components/features/media-server-requirements';
import ContentDeliverables from '@/components/features/content-deliverables';
import { useAuth } from '@/contexts/auth-context';
import UserManagementTab from '@/components/features/user-management-tab';

const resolutionPresets = {
  '1080p': { width: 1920, height: 1080 },
  '4K UHD': { width: 3840, height: 2160 },
  'DCI 4K': { width: 4096, height: 2160 },
};

const CleanRasterMapForLiveOutput = ({ activeRaster, pixelMaps, ledProducts, finalWidth, finalHeight, numCols, numRows, canvasWidth, canvasHeight, useSmartPacking }: { activeRaster: any, pixelMaps: any[], ledProducts: any[], finalWidth: number, finalHeight: number, numCols: number, numRows: number, canvasWidth: number, canvasHeight: number, useSmartPacking: boolean }) => {
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
              if (screen.isMixed && screen.ledScreenHalfWidth > 0 && halfProduct) screenWidthPx += screen.ledScreenHalfWidth * halfProduct.width_px;
              let screenHeightPx = screen.ledScreenHeight * screen.ledTileHeightPx;
              if (screen.isMixed && screen.ledScreenHalfHeight > 0 && halfProduct) screenHeightPx += screen.ledScreenHalfHeight * halfProduct.height_px;
              if (screenWidthPx <= 0 || screenHeightPx <= 0) return null;
              return { ...setting, ...screen, screenWidthPx, screenHeightPx, halfProduct };
          }).filter(Boolean);
    }, [activeRaster, pixelMaps, ledProducts]);

    return (
        <div className="relative" style={{ width: `${finalWidth}px`, height: `${finalHeight}px`, backgroundColor: activeRaster.backgroundColor }}>
            {renderedScreens.map((screen: any) => (
                <div key={screen.id} className="absolute" style={{ left: `${screen.positionX}px`, top: `${screen.positionY}px`, width: `${screen.screenWidthPx}px`, height: `${screen.screenHeightPx}px`, backgroundColor: screen.borderColor }}>
                    <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none text-white font-bold">
                        {screen.name}
                    </div>
                </div>
            ))}
        </div>
    );
};

const LiveOutputPortal = () => {
    const { state, getActiveRaster } = useProjectContext();
    const { liveOutputContainer, pixelMaps, ledProducts, power: { useSmartPacking } } = state;
    const activeRaster = getActiveRaster();

    const { numCols, numRows, canvasWidth, canvasHeight } = useMemo(() => {
        if (!activeRaster) return { numCols: 1, numRows: 1, canvasWidth: 0, canvasHeight: 0 };
        const cw = activeRaster.resolutionPreset === 'Custom' ? activeRaster.customWidth : resolutionPresets[activeRaster.resolutionPreset].width;
        const ch = activeRaster.resolutionPreset === 'Custom' ? activeRaster.customHeight : resolutionPresets[activeRaster.resolutionPreset].height;
        return { numCols: 1, numRows: 1, canvasWidth: cw, canvasHeight: ch };
    }, [activeRaster]);

    if (!liveOutputContainer || !activeRaster) return null;

    return ReactDOM.createPortal(
        <CleanRasterMapForLiveOutput
            activeRaster={activeRaster}
            pixelMaps={pixelMaps}
            ledProducts={ledProducts}
            finalWidth={numCols * canvasWidth}
            finalHeight={numRows * canvasHeight}
            numCols={numCols}
            numRows={numRows}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            useSmartPacking={useSmartPacking}
        />,
        liveOutputContainer
    );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('getting-started');
  const { isAdmin } = useAuth();

  return (
    <ProjectProvider setActiveTab={setActiveTab}>
      <SidebarProvider>
        <div className="flex h-screen bg-background overflow-hidden">
          <Sidebar collapsible="icon" className="border-r">
            <SettingsPanel activeTab={activeTab} />
          </Sidebar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 flex flex-col overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                <div className="px-4 md:px-6 pt-4 border-b">
                  <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 pb-4 justify-start">
                    <TabsTrigger value="getting-started" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight">Start</TabsTrigger>
                    {isAdmin && <TabsTrigger value="product-library" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Product Library</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="processor-library" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Processor Library</TabsTrigger>}
                    <TabsTrigger value="product-finder" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Product Finder</TabsTrigger>
                    <TabsTrigger value="led-calculator" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">LED Calculator</TabsTrigger>
                    <TabsTrigger value="power" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Power & Data</TabsTrigger>
                    <TabsTrigger value="pixel-map" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Pixel Map</TabsTrigger>
                    <TabsTrigger value="raster-map" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Raster Map</TabsTrigger>
                    <TabsTrigger value="wiring-diagram" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Wiring Diagram</TabsTrigger>
                    <TabsTrigger value="hardware-requirement" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Hardware</TabsTrigger>
                    <TabsTrigger value="media-server" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Media Server</TabsTrigger>
                    <TabsTrigger value="content-deliverables" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">Deliverables</TabsTrigger>
                    {isAdmin && <TabsTrigger value="user-management" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9 font-bold uppercase text-[12px] tracking-tight text-nowrap">User Management</TabsTrigger>}
                  </TabsList>
                </div>
                <div className="flex-1 overflow-auto">
                  <TabsContent value="getting-started" className="p-4 md:p-6"><GettingStarted /></TabsContent>
                  {isAdmin && <TabsContent value="product-library" className="p-4 md:p-6"><ProductLibrary /></TabsContent>}
                  {isAdmin && <TabsContent value="processor-library" className="p-4 md:p-6"><ProcessorLibrary /></TabsContent>}
                  <TabsContent value="product-finder" className="p-4 md:p-6"><ProductFinder /></TabsContent>
                  <TabsContent value="led-calculator" className="p-4 md:p-6"><LedCalculator /></TabsContent>
                  <TabsContent value="power" className="p-4 md:p-6"><PowerDataCalculator /></TabsContent>
                  <TabsContent value="pixel-map" className="p-4 md:p-6 space-y-4"><PixelMapGenerator /></TabsContent>
                  <TabsContent value="raster-map" className="p-4 md:p-6 space-y-4"><RasterMapGenerator /></TabsContent>
                  <TabsContent value="wiring-diagram" className="p-4 md:p-6"><WiringDiagram /></TabsContent>
                  <TabsContent value="hardware-requirement" className="p-4 md:p-6"><HardwareRequirements /></TabsContent>
                  <TabsContent value="media-server" className="p-4 md:p-6"><MediaServerRequirements /></TabsContent>
                  <TabsContent value="content-deliverables" className="p-4 md:p-6"><ContentDeliverables /></TabsContent>
                  {isAdmin && <TabsContent value="user-management" className="p-4 md:p-6"><UserManagementTab /></TabsContent>}
                </div>
              </Tabs>
            </main>
          </div>
          <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
            <ProjectExport />
          </div>
          <LiveOutputPortal />
        </div>
      </SidebarProvider>
    </ProjectProvider>
  );
}