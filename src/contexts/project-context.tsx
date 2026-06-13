
'use client';

import { useToast } from '@/hooks/use-toast';
import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, DependencyList } from 'react';
import { LEDProduct, addProduct as addProductToDB, deleteProduct as deleteProductFromDB, getProducts, updateProduct as updateProductInDB } from '@/services/product-service';
import { Processor, addProcessor as addProcessorToDB, getProcessors, deleteProcessor as deleteProductFromDB_Proc, updateProcessor as updateProcessorInDB } from '@/services/processor-service';
import { Project, getProjects as getProjectsFromDB, addProject as addProjectToDB, updateProject as updateProjectInDB, deleteProject as deleteProjectFromDB } from '@/services/project-service';
import { MediaServer, getMediaServersFromDB, addMediaServer as addMediaServerToDB, updateMediaServer as updateMediaServerInDB, deleteMediaServer as deleteMediaServerFromDB } from '@/services/media-server-service';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase } from '@/firebase';
import { serverTimestamp } from 'firebase/firestore';

export const PROJECTION_COLORS = [
    '#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777', '#4B5563', '#0891B2',
];

const DEFAULT_MEDIA_SERVERS: MediaServer[] = [
  { id: 'disguise-vx4', name: 'Disguise VX4+', outputs: 4, maxResolution: '4K @ 60Hz', codecs: ['NotchLC', 'HAP', 'H.265'], audio: 'Embedded or Separate' },
  { id: 'disguise-gx3', name: 'Disguise GX 3', outputs: 3, maxResolution: '4K @ 60Hz', codecs: ['NotchLC', 'HAP', 'H.265'], audio: 'Embedded or Separate' },
  { id: 'disguise-ex3', name: 'Disguise EX 3', outputs: 3, maxResolution: '4K @ 60Hz', codecs: ['H.265', 'H.264'], audio: 'Embedded or Separate'},
  { id: 'pixera-two', name: 'PIXERA two', outputs: 2, maxResolution: '4K @ 60Hz', codecs: ['HAP', 'H.265'], audio: 'Embedded or Separate' },
  { id: 'resolume-arena', name: 'Resolume Arena', outputs: 'Variable', maxResolution: 'Depends on Hardware', codecs: ['DXV', 'HAP', 'H.264'], audio: 'Embedded or Separate' },
  { id: 'millumin', name: 'Millumin', outputs: 'Variable', maxResolution: 'Depends on Hardware', codecs: ['HAP', 'ProRes', 'H.264'], audio: 'Embedded or Separate' },
  { id: 'watchout', name: 'Dataton WATCHOUT', outputs: 'Variable', maxResolution: 'Depends on Hardware', codecs: ['HAP', 'ProRes', 'MPEG-2'], audio: 'Embedded or Separate' },
  { id: 'custom', name: 'Custom', outputs: 'N/A', maxResolution: 'N/A', codecs: ['N/A'], audio: 'N/A' },
];

export const STRIP_GAP = 5;

const resolutionPresets = {
  '1080p': { width: 1920, height: 1080 },
  '4K UHD': { width: 3840, height: 2160 },
  'DCI 4K': { width: 4096, height: 2160 },
};

type MeasurementUnit = 'px' | 'tiles' | 'ft' | 'in' | 'm' | 'mm';

export interface CalculatorState {
    operatingVoltage: 110 | 208 | 230;
    phaseConfiguration: 'single' | 'three';
    screenSizeUnits: MeasurementUnit;
    screenWidth: number;
    screenHeight: number;
    wallShape: 'straight' | 'concave' | 'convex';
    arcLength: number;
    radius: number;
    preferFullTiles: boolean;
}

export interface PowerState {
  operatingVoltage: '110v' | '208v' | '230v';
  processorType: string;
  useBackupProcessor: boolean;
  useSmartPacking: boolean;
  refreshRate: string;
  colorDepth: '8bit' | '10bit' | '12bit';
}

export type AspectRatioPreset = '16:9' | '16:10' | '4:3' | '21:9' | '1:1' | '3:2' | '5:4';

export interface ProductFinderState {
  productType: 'wall' | 'floor';
  inputMethod: 'dimensions' | 'ratio';
  measurementUnit: MeasurementUnit;
  width: number;
  height: number;
  manufacturerFilter: string;
  searchQuery: string;
  matchQualityFilter: { exact: boolean; close: boolean; approximate: boolean; };
  aspectRatioPreset: AspectRatioPreset;
  isCustomAspectRatio: boolean;
  customAspectRatioX: number;
  customAspectRatioY: number;
  preferFullTiles: boolean;
}

export interface ProjectionScreen {
    id: string;
    name: string;
    manufacturer?: string;
    product?: string;
    resolution: string;
}

export interface ExternalLedAsset {
    id: string;
    name: string;
    manufacturer?: string;
    product?: string;
    externalMapUrl: string;
    externalMapResolution: string;
    aspect: string;
    color?: string;
}

export interface DeliverablesState {
    projectName: string;
    showName: boolean;
    showAuthor: boolean;
    showDate: boolean;
    showNumber: boolean;
    showVersion: boolean;
    projectNumber: string;
    projectVersion: string;
    showDisplayHardware: boolean;
    showVideoSpec: boolean;
    selectedFrameRates: string[];
    selectedCodecs: string[];
    selectedAudioFormats: string[];
    selectedAudioSampleRates: string[];
    selectedAudioBitDepths: string[];
    selectedAudioCodecs?: string[];
    selectedImageFormats: string[];
    showRigging: boolean;
    showPlayback: boolean;
    showLedSection: boolean;
    showProjectionSection: boolean;
    projectionScreens: ProjectionScreen[];
    externalLedAssets: ExternalLedAsset[];
}

interface MediaServerState {
  selectedServerId: string;
  useBackupServer: boolean;
}

export interface OverlayText {
    id: number;
    text: string;
    color: string;
    fontSize: number;
    fontFamily: string;
    position: { x: number; y: number };
}

export type WiringPattern = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' | 'serpentine-lr' | 'serpentine-rl' | 'serpentine-tb-lr' | 'serpentine-tb-rl';

export interface PixelMapState {
  id: string;
  name: string;
  ledManufacturer: string;
  ledProduct: string;
  ledScreenWidth: number;
  ledScreenHeight: number;
  isMixed: boolean;
  ledScreenHalfWidth: number;
  ledScreenHalfHeight: number;
  ledHalfProduct?: string;
  halfPanelPosition: 'left' | 'right';
  ledTileWidthPx: number;
  ledTileHeightPx: number;
  panelWidthMM: number;
  panelHeightMM: number;
  panelWeight: number;
  panelPowerMax: number;
  panelPowerAvg: number;
  ledTileBorderPx: number;
  borderColor: string;
  tileColor1: string;
  tileColor2: string;
  overlayTexts: OverlayText[];
  showScalingOverlay: boolean;
  tileNumbering: 'none' | 'sequential' | 'col-row' | 'row-col';
  tileNumberSize: number;
  tileNumberColor: string;
  zoom: number;
  wiringMode: 'data' | 'power';
  wiringPattern: WiringPattern;
  powerWiringPattern: WiringPattern;
  mountingType: 'flown' | 'ground-stack' | 'floor';
  sandbagWeight: 25 | 35;
  cornerBlock: boolean;
  externalMapUrl?: string;
  externalMapResolution?: string;
}

interface RasterScreenSetting {
    screenId: string;
    positionX: number;
    positionY: number;
    nameFontSize: number;
}

export interface RasterMapState {
    id: string;
    name: string;
    processorType: string;
    resolutionPreset: '1080p' | '4K UHD' | 'DCI 4K' | 'Custom';
    customWidth: number;
    customHeight: number;
    backgroundColor: string;
    showScreenNames: boolean;
    showCoordinates: boolean;
    showTileLabels: boolean;
    screenAssignments: Record<string, boolean>;
    screenSettings: RasterScreenSetting[];
    zoom: number;
}

const defaultScreen: Omit<PixelMapState, 'id' | 'name'> = {
    ledManufacturer: '', ledProduct: '', ledScreenWidth: 8, ledScreenHeight: 5, isMixed: false, ledScreenHalfWidth: 0, ledScreenHalfHeight: 0, ledHalfProduct: '', halfPanelPosition: 'right', ledTileWidthPx: 176, ledTileHeightPx: 176, panelWidthMM: 500, panelHeightMM: 500, panelWeight: 8.5, panelPowerMax: 150, panelPowerAvg: 75, ledTileBorderPx: 1, borderColor: '#000000', tileColor1: '#00529B', tileColor2: '#A0C8E0', overlayTexts: [], showScalingOverlay: false, tileNumbering: 'sequential', tileNumberSize: 20, tileNumberColor: '#FFFFFF', zoom: 1, wiringMode: 'data', wiringPattern: 'left-to-right', powerWiringPattern: 'left-to-right', mountingType: 'flown', sandbagWeight: 25, cornerBlock: false,
};

const defaultRaster: Omit<RasterMapState, 'id' | 'name' | 'screenSettings' | 'screenAssignments'> = {
    processorType: '', resolutionPreset: '4K UHD', customWidth: 3840, customHeight: 2160, backgroundColor: '#000000', showScreenNames: true, showCoordinates: true, showTileLabels: true, zoom: 1,
};

interface ProjectState {
  projectName: string;
  projectDescription: string;
  projectAuthor: string;
  calculator: CalculatorState;
  productFinder: ProductFinderState;
  power: PowerState;
  rasters: RasterMapState[];
  activeRasterIndex: number;
  activeTileIndex: number;
  pixelMaps: PixelMapState[];
  activeScreenIndex: number;
  ledProducts: LEDProduct[];
  processors: Processor[];
  mediaServers: MediaServer[];
  isProductsLoading: boolean;
  isProcessorsLoading: boolean;
  isMediaServersLoading: boolean;
  wiringDiagramZoom: number;
  mediaServer: MediaServerState;
  deliverables: DeliverablesState;
  setActiveTab: (tab: string) => void;
  isDecimalErrorDialogOpen: boolean;
  isLargeTileConversionWarningOpen: boolean;
  pendingCalculatorChange: { key: string; value: any } | null;
  projects: Project[];
  isProjectsLoading: boolean;
  activeProjectId: string | null;
  liveOutputWindow: Window | null;
  liveOutputContainer: HTMLElement | null;
  isAddingProduct: boolean;
  isAddingProcessor: boolean;
}

const defaultInitialState: ProjectState = {
  projectName: 'My LED Project', projectDescription: '', projectAuthor: '',
  calculator: { operatingVoltage: 208, phaseConfiguration: 'three', screenSizeUnits: 'tiles', screenWidth: 8, screenHeight: 5, wallShape: 'straight', arcLength: 4000, radius: 0, preferFullTiles: false },
  productFinder: { productType: 'wall', inputMethod: 'dimensions', measurementUnit: 'ft', width: 8, height: 5, manufacturerFilter: 'all', searchQuery: '', matchQualityFilter: { exact: true, close: true, approximate: true }, aspectRatioPreset: '16:9', isCustomAspectRatio: false, customAspectRatioX: 16, customAspectRatioY: 9, preferFullTiles: false },
  power: { operatingVoltage: '208v', processorType: '', useBackupProcessor: false, useSmartPacking: true, refreshRate: '60 Hz', colorDepth: '10bit' },
  rasters: [], activeRasterIndex: 0, activeTileIndex: 0, pixelMaps: [], activeScreenIndex: 0, ledProducts: [], processors: [], mediaServers: DEFAULT_MEDIA_SERVERS, isProductsLoading: true, isProcessorsLoading: true, isMediaServersLoading: true, wiringDiagramZoom: 1, mediaServer: { selectedServerId: 'disguise-vx4', useBackupServer: false },
  deliverables: { 
    projectName: 'My LED Project', showName: true, showAuthor: true, showDate: true, showNumber: false, showVersion: true, projectNumber: 'L100000', projectVersion: '01', showDisplayHardware: true, showVideoSpec: true, selectedFrameRates: ['60fps'], selectedCodecs: ['NotchLC'], selectedAudioFormats: ['Embedded'], selectedAudioSampleRates: ['48kHz'], selectedAudioBitDepths: ['24-bit'], selectedImageFormats: ['PNG'], showRigging: true, showPlayback: true,
    showLedSection: true,
    showProjectionSection: false,
    projectionScreens: [
        { id: 'p1', name: 'Main Projection', resolution: '1920 x 1080', manufacturer: 'N/A', product: 'N/A' }
    ],
    externalLedAssets: []
  },
  setActiveTab: () => {}, isDecimalErrorDialogOpen: false, isLargeTileConversionWarningOpen: false, pendingCalculatorChange: null, projects: [], isProjectsLoading: false, activeProjectId: null, liveOutputWindow: null, liveOutputContainer: null,
  isAddingProduct: false, isAddingProcessor: false,
};

interface ProjectContextType {
  state: ProjectState;
  setState: React.Dispatch<React.SetStateAction<ProjectState>>;
  exportConfig: () => void;
  importConfig: (file: File) => void;
  addProduct: (product: Omit<LEDProduct, 'id'>) => Promise<string>;
  updateProduct: (id: string, updatedProduct: LEDProduct) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addProcessor: (processor: Omit<Processor, 'id'>) => Promise<string>;
  updateProcessor: (id: string, updatedProcessor: Partial<Omit<Processor, 'id'>>) => Promise<void>;
  deleteProcessor: (processorId: string) => Promise<void>;
  addMediaServer: (server: Omit<MediaServer, 'id'>) => Promise<string>;
  updateMediaServer: (id: string, updatedServer: Partial<Omit<MediaServer, 'id'>>) => Promise<void>;
  deleteMediaServer: (serverId: string) => Promise<void>;
  addScreen: () => void;
  duplicateScreen: (index: number) => void;
  removeScreen: (index: number) => void;
  setActiveScreen: (index: number) => void;
  getActiveScreen: () => PixelMapState | undefined;
  addRaster: () => void;
  duplicateRaster: (index: number) => void;
  removeRaster: (index: number) => void;
  setActiveRaster: (index: number, tileIndex?: number) => void;
  getActiveRaster: () => RasterMapState | undefined;
  getLayoutMetrics: (raster: RasterMapState) => any;
  powerAndDataCalculations: any;
  handleActiveScreenChange: (key: string, value: any) => void;
  handleCalculatorChange: (key: string, value: any, forceUnit?: MeasurementUnit) => void;
  saveProject: () => Promise<void>;
  loadProject: (project: Project) => void;
  deleteProject: (projectId: string) => Promise<void>;
  createNewProject: () => void;
  handleAddManualLedAsset: () => void;
  handleAddOverlay: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

function getInitialProjectState() {
    const firstScreenId = `screen-${Date.now()}`;
    const firstRasterId = `raster-${Date.now()}`;
    const initialScreens: PixelMapState[] = [{ ...defaultScreen, id: firstScreenId, name: 'Screen 1' }];
    const initialRasters: RasterMapState[] = [{ ...defaultRaster, id: firstRasterId, name: 'Raster 1', screenAssignments: { [firstScreenId]: true }, screenSettings: [{ screenId: firstScreenId, positionX: 0, positionY: 0, nameFontSize: 16 }] }];
    return { ...defaultInitialState, pixelMaps: initialScreens, rasters: initialRasters, calculator: { ...defaultInitialState.calculator, screenWidth: initialScreens[0].ledScreenWidth, screenHeight: initialScreens[0].ledScreenHeight } };
}

export function ProjectProvider({ children, setActiveTab }: { children: ReactNode, setActiveTab: (tab: string) => void }) {
  const [state, setState] = useState<ProjectState>(() => ({ ...getInitialProjectState(), setActiveTab }));
  const { toast } = useToast();
  const { user } = useAuth();
  const { firestore } = useFirebase();

  useEffect(() => {
    const fetchProducts = async () => {
      const products = await getProducts();
      setState(prevState => ({ ...prevState, ledProducts: products, isProductsLoading: false }));
    };
    const fetchProcessors = async () => {
      const processors = await getProcessors();
      const sx40 = processors.find(p => p.name.toUpperCase().includes('SX40'));
      setState(prevState => ({ ...prevState, processors, power: sx40 ? { ...prevState.power, processorType: sx40.id } : { ...prevState.power }, isProcessorsLoading: false }));
    };
    const fetchMediaServers = async () => {
      try {
        const servers = await getMediaServersFromDB();
        setState(prevState => ({ 
          ...prevState, 
          mediaServers: servers.length > 0 ? servers : DEFAULT_MEDIA_SERVERS, 
          isMediaServersLoading: false 
        }));
      } catch (e) {
        setState(prevState => ({ ...prevState, isMediaServersLoading: false }));
      }
    };
    fetchProducts();
    fetchProcessors();
    fetchMediaServers();
  }, []);

  useEffect(() => {
    if (user && firestore) {
      const fetchProjects = async () => {
        setState(prev => ({ ...prev, isProjectsLoading: true }));
        try {
          const userProjects = await getProjectsFromDB(firestore, user.uid);
          setState(prev => ({ ...prev, projects: userProjects, isProjectsLoading: false }));
        } catch (error) {
          console.error("Error fetching projects:", error);
          setState(prev => ({ ...prev, projects: [], isProjectsLoading: false }));
        }
      };
      fetchProjects();
    } else {
      setState(prev => ({ ...prev, projects: [], isProjectsLoading: false }));
    }
  }, [user, firestore]);

  useEffect(() => {
    const selectedServer = state.mediaServers.find(s => s.id === state.mediaServer.selectedServerId);
    if (selectedServer && selectedServer.id !== 'custom') {
        setState(prev => ({
            ...prev,
            deliverables: {
                ...prev.deliverables,
                selectedCodecs: [...new Set([...prev.deliverables.selectedCodecs, ...selectedServer.codecs])]
            }
        }));
    }
  }, [state.mediaServer.selectedServerId, state.mediaServers]);

  function getLayoutMetrics(raster: RasterMapState) {
    const cw = raster.resolutionPreset === 'Custom' ? raster.customWidth : (resolutionPresets[raster.resolutionPreset as keyof typeof resolutionPresets]?.width || 1920);
    const ch = raster.resolutionPreset === 'Custom' ? raster.customHeight : (resolutionPresets[raster.resolutionPreset as keyof typeof resolutionPresets]?.height || 1080);

    const renderedScreens = Object.keys(raster.screenAssignments)
        .filter(screenId => raster.screenAssignments[screenId])
        .map(screenId => {
            const screen = state.pixelMaps.find(p => p.id === screenId);
            const setting = raster.screenSettings.find(s => s.screenId === screenId);
            if (!screen || !setting) return null;
            
            const halfProduct = screen.isMixed ? state.ledProducts.find(p => p.manufacturer === screen.ledManufacturer && p.name === screen.ledHalfProduct) : undefined;
            let screenWidthPx = screen.ledScreenWidth * screen.ledTileWidthPx;
            if (screen.isMixed && screen.ledScreenHalfWidth > 0) screenWidthPx += (halfProduct ? halfProduct.width_px : screen.ledTileWidthPx / 2);
            let screenHeightPx = screen.ledScreenHeight * screen.ledTileHeightPx;
            if (screen.isMixed && screen.ledScreenHalfHeight > 0) screenHeightPx += (halfProduct ? halfProduct.height_px : screen.ledTileHeightPx / 2);
            
            return { positionX: setting.positionX, positionY: setting.positionY, screenWidthPx, screenHeightPx };
        }).filter(Boolean);

    const bounds = renderedScreens.reduce((acc, screen) => {
        if (!screen) return acc;
        const processorWidth = cw;
        const processorHeight = ch;
        const screenResolutionX = screen.screenWidthPx;
        const screenResolutionY = screen.screenHeightPx;

        let packingMode: 'none' | 'vertical' | 'horizontal' = 'none';
        let strips = 1;

        if (state.power.useSmartPacking) {
            const canFitNormally = screenResolutionX <= processorWidth && screenResolutionY <= processorHeight;
            if (!canFitNormally) {
                const stripsForWidth = Math.ceil(screenResolutionX / processorWidth);
                const hForW = (stripsForWidth * screenResolutionY) + ((stripsForWidth - 1) * STRIP_GAP);
                if (hForW <= processorHeight) { packingMode = 'vertical'; strips = stripsForWidth; }
                else {
                    const stripsForHeight = Math.ceil(screenResolutionY / processorHeight);
                    const wForH = (stripsForHeight * screenResolutionX) + ((stripsForHeight - 1) * STRIP_GAP);
                    if (wForH <= processorWidth) { packingMode = 'horizontal'; strips = stripsForHeight; }
                }
            }
        }
        
        let packedWidth, packedHeight;
        if (packingMode === 'vertical') { packedWidth = Math.min(screenResolutionX, processorWidth); packedHeight = (strips * screenResolutionY) + ((strips - 1) * STRIP_GAP); }
        else if (packingMode === 'horizontal') { packedWidth = (strips * screenResolutionX) + ((strips - 1) * STRIP_GAP); packedHeight = Math.min(screenResolutionY, processorHeight); }
        else { packedWidth = screenResolutionX; packedHeight = screenResolutionY; }

        acc.maxX = Math.max(acc.maxX, screen.positionX + packedWidth);
        acc.maxY = Math.max(acc.maxY, screen.positionY + packedHeight);
        return acc;
    }, { maxX: 0, maxY: 0 });

    const totalWidth = Math.max(bounds.maxX, cw);
    const totalHeight = Math.max(bounds.maxY, ch);
    const numCols = cw > 0 ? Math.ceil(totalWidth / cw) : 1;
    const numRows = ch > 0 ? Math.ceil(totalHeight / ch) : 1;

    return { totalWidth, totalHeight, numCols, numRows, canvasWidth: cw, canvasHeight: ch };
  }

  function handleActiveScreenChange(key: string, value: any) {
    setState(prevState => {
      const newPixelMaps = [...prevState.pixelMaps];
      const screen = newPixelMaps[prevState.activeScreenIndex];
      if (!screen) return prevState;

      let updatedScreen = { ...screen, [key]: value };
      let newCalculator = { ...prevState.calculator };

      if (key === 'ledManufacturer') {
        updatedScreen.ledProduct = value === 'Custom' ? 'Custom' : '';
        updatedScreen.ledHalfProduct = '';
        updatedScreen.isMixed = false;
      }

      if (key === 'ledProduct') {
        const product = prevState.ledProducts.find(
          p => p.manufacturer === updatedScreen.ledManufacturer && p.name === value
        );
        if (product) {
          updatedScreen.ledTileWidthPx = product.width_px;
          updatedScreen.ledTileHeightPx = product.height_px;
          updatedScreen.panelWidthMM = product.width_mm;
          updatedScreen.panelHeightMM = product.height_mm;
          updatedScreen.panelWeight = product.weight_kg;
          updatedScreen.panelPowerMax = product.power_watts_max;
          updatedScreen.panelPowerAvg = product.power_watts_avg;
          
          updatedScreen.isMixed = false;
          updatedScreen.ledHalfProduct = '';
          updatedScreen.ledScreenHalfWidth = 0;
          updatedScreen.ledScreenHalfHeight = 0;

          if (updatedScreen.mountingType === 'floor' && !product.isFloor) {
              updatedScreen.mountingType = 'flown';
          }

          if (newCalculator.screenSizeUnits === 'tiles') {
            newCalculator.screenWidth = updatedScreen.ledScreenWidth;
            newCalculator.screenHeight = updatedScreen.ledScreenHeight;
          }
        }
      }

      newPixelMaps[prevState.activeScreenIndex] = updatedScreen;
      return { ...prevState, pixelMaps: newPixelMaps, calculator: newCalculator };
    });
  }

  function handleCalculatorChange(key: string, value: any, forceUnit?: MeasurementUnit) {
    setState((prevState) => {
        const newCalculatorState = { ...prevState.calculator, [key]: value };
        if (forceUnit) {
            newCalculatorState.screenSizeUnits = forceUnit;
        }
        
        const newPixelMaps = [...prevState.pixelMaps];
        const activeIdx = prevState.activeScreenIndex;
        const currentScreen = { ...newPixelMaps[activeIdx] };

        const unit = newCalculatorState.screenSizeUnits;
        
        let widthVal = Number(newCalculatorState.screenWidth);
        let heightVal = Number(newCalculatorState.screenHeight);

        if (key === 'screenWidth') widthVal = value === '' ? 0 : Number(value);
        if (key === 'screenHeight') heightVal = value === '' ? 0 : Number(value);

        let widthMM = 0;
        let heightMM = 0;

        if (unit === 'mm') { widthMM = widthVal; heightMM = heightVal; }
        else if (unit === 'm') { widthMM = widthVal * 1000; heightMM = heightVal * 1000; }
        else if (unit === 'in') { widthMM = widthVal * 25.4; heightMM = heightVal * 25.4; }
        else if (unit === 'ft') { widthMM = widthVal * 304.8; heightMM = heightVal * 304.8; }
        else if (unit === 'px') { 
            widthMM = widthVal * (currentScreen.panelWidthMM / (currentScreen.ledTileWidthPx || 1));
            heightMM = heightVal * (currentScreen.panelHeightMM / (currentScreen.ledTileHeightPx || 1));
        }

        if (unit !== 'tiles') {
            const panelW = currentScreen.panelWidthMM;
            const panelH = currentScreen.panelHeightMM;
            if (panelW > 0 && panelH > 0) {
                const rawTilesX = widthMM / panelW;
                const rawTilesY = heightMM / panelH;
                
                if (newCalculatorState.preferFullTiles) {
                    currentScreen.ledScreenWidth = Math.round(rawTilesX);
                    currentScreen.ledScreenHeight = Math.round(rawTilesY);
                    currentScreen.ledScreenHalfWidth = 0;
                    currentScreen.ledScreenHalfHeight = 0;
                } else {
                    currentScreen.ledScreenWidth = Math.floor(rawTilesX);
                    currentScreen.ledScreenHeight = Math.floor(rawTilesY);
                    currentScreen.ledScreenHalfWidth = (rawTilesX % 1 >= 0.1) ? 1 : 0;
                    currentScreen.ledScreenHalfHeight = (rawTilesY % 1 >= 0.1) ? 1 : 0;
                }
            }
        } else {
            if (newCalculatorState.preferFullTiles) {
                currentScreen.ledScreenWidth = Math.round(widthVal);
                currentScreen.ledScreenHeight = Math.round(heightVal);
                currentScreen.ledScreenHalfWidth = 0;
                currentScreen.ledScreenHalfHeight = 0;
            } else {
                currentScreen.ledScreenWidth = Math.floor(widthVal);
                currentScreen.ledScreenHeight = Math.floor(heightVal);
                currentScreen.ledScreenHalfWidth = (widthVal % 1 >= 0.1) ? 1 : 0;
                currentScreen.ledScreenHalfHeight = (heightVal % 1 >= 0.1) ? 1 : 0;
            }
        }
        
        currentScreen.isMixed = currentScreen.ledScreenHalfWidth > 0 || currentScreen.ledScreenHalfHeight > 0;
        if (currentScreen.isMixed && !currentScreen.ledHalfProduct) {
            const halfProd = prevState.ledProducts.find(p => p.manufacturer === currentScreen.ledManufacturer && p.parent_id);
            if (halfProd) currentScreen.ledHalfProduct = halfProd.name;
        }

        newPixelMaps[activeIdx] = currentScreen;
        return { ...prevState, calculator: newCalculatorState, pixelMaps: newPixelMaps };
    });
  }

  function exportConfig() {
    const { 
      projectName, projectDescription, projectAuthor, calculator, productFinder, 
      power, rasters, pixelMaps, wiringDiagramZoom, mediaServer, deliverables 
    } = state;
    
    const configToExport = {
      projectName, projectDescription, projectAuthor, calculator, productFinder, 
      power, rasters, pixelMaps, wiringDiagramZoom, mediaServer, deliverables
    };

    const dataStr = JSON.stringify(configToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `${(projectName || 'Project').replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Export Successful', description: `Project exported as ${(projectName || 'Project').replace(/\s+/g, '_')}.json` });
  }

  function importConfig(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        if (!importedData.pixelMaps || !importedData.rasters) {
            throw new Error("Invalid project file format. Missing core project data.");
        }

        setState(prev => ({
          ...prev,
          ...importedData,
          ledProducts: prev.ledProducts,
          processors: prev.processors,
          mediaServers: prev.mediaServers,
          isProductsLoading: prev.isProductsLoading,
          isProcessorsLoading: prev.isProcessorsLoading,
          isMediaServersLoading: prev.isMediaServersLoading,
          projects: prev.projects,
          isProjectsLoading: prev.isProjectsLoading,
          activeProjectId: null,
          setActiveTab: prev.setActiveTab,
          activeScreenIndex: 0,
          activeRasterIndex: 0,
          activeTileIndex: 0,
        }));
        
        toast({ title: 'Import Successful', description: `Successfully loaded "${importedData.projectName || 'Unnamed Project'}"` });
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Import Failed', description: err.message || 'The file could not be read as a valid project configuration.' });
      }
    };
    reader.readAsText(file);
  }

  async function addProduct(p: any) { const id = await addProductToDB(p); setState(s => ({ ...s, ledProducts: [...s.ledProducts, { ...p, id }] })); toast({ title: 'Product Added' }); return id; }
  async function updateProduct(id: string, p: any) { await updateProductInDB(id, p); setState(s => ({ ...s, ledProducts: s.ledProducts.map(x => x.id === id ? { ...p, id } : x) })); toast({ title: 'Product Updated' }); }
  async function deleteProduct(id: string) { await deleteProductFromDB(id); setState(s => ({ ...s, ledProducts: s.ledProducts.filter(x => x.id !== id) })); toast({ title: 'Product Deleted' }); }
  async function addProcessor(p: any) { const id = await addProcessorToDB(p); setState(s => ({ ...s, processors: [...s.processors, { ...p, id }] })); toast({ title: 'Processor Added' }); return id; }
  async function updateProcessor(id: string, p: any) { await updateProcessorInDB(id, p); setState(s => ({ ...s, processors: s.processors.map(x => x.id === id ? { ...x, ...p } : x) })); toast({ title: 'Processor Updated' }); }
  async function deleteProcessor(id: string) { await deleteProductFromDB_Proc(id); setState(s => ({ ...s, processors: s.processors.filter(x => x.id !== id) })); toast({ title: 'Processor Deleted' }); }
  
  async function addMediaServer(s: any) { const id = await addMediaServerToDB(s); setState(state => ({ ...state, mediaServers: [...state.mediaServers, { ...s, id }] })); toast({ title: 'Media Server Added' }); return id; }
  async function updateMediaServer(id: string, s: any) { await updateMediaServerInDB(id, s); setState(state => ({ ...state, mediaServers: state.mediaServers.map(x => x.id === id ? { ...x, ...s } : x) })); toast({ title: 'Media Server Updated' }); }
  async function deleteMediaServer(id: string) { await deleteMediaServerFromDB(id); setState(state => ({ ...state, mediaServers: state.mediaServers.filter(x => x.id !== id) })); toast({ title: 'Media Server Deleted' }); }

  function addScreen() { const newId = `screen-${Date.now()}`; setState(prevState => ({ ...prevState, pixelMaps: [...prevState.pixelMaps, { ...defaultScreen, id: newId, name: `Screen ${state.pixelMaps.length + 1}` }], activeScreenIndex: prevState.pixelMaps.length })); }
  function duplicateScreen(index: number) { const screenToDup = state.pixelMaps[index]; if (!screenToDup) return; const newScreen = { ...screenToDup, id: `screen-${Date.now()}`, name: `${screenToDup.name} (Copy)` }; setState(prevState => ({ ...prevState, pixelMaps: [...prevState.pixelMaps, newScreen], activeScreenIndex: prevState.pixelMaps.length })); }
  function removeScreen(index: number) { if (state.pixelMaps.length <= 1) return; setState(prevState => { const newPixelMaps = prevState.pixelMaps.filter((_, i) => i !== index); const newActiveIndex = Math.max(0, prevState.activeScreenIndex >= index ? prevState.activeScreenIndex - 1 : prevState.activeScreenIndex); return { ...prevState, pixelMaps: newPixelMaps, activeScreenIndex: newActiveIndex }; }); }
  function setActiveScreen(index: number) { setState(s => ({ ...s, activeScreenIndex: index })); }
  function getActiveScreen() { return state.pixelMaps[state.activeScreenIndex]; }
  
  function addRaster() { const newId = `raster-${Date.now()}`; setState(prevState => ({ ...prevState, rasters: [...prevState.rasters, { ...defaultRaster, id: newId, name: `Raster ${state.rasters.length + 1}`, screenAssignments: {}, screenSettings: [] }], activeRasterIndex: prevState.rasters.length, activeTileIndex: 0 })); }
  function duplicateRaster(index: number) { const rasterToDup = state.rasters[index]; if (!rasterToDup) return; const newRaster = { ...rasterToDup, id: `raster-${Date.now()}`, name: `${rasterToDup.name} (Copy)`, screenAssignments: { ...rasterToDup.screenAssignments }, screenSettings: [...rasterToDup.screenSettings] }; setState(prevState => ({ ...prevState, rasters: [...prevState.rasters, newRaster], activeRasterIndex: prevState.rasters.length, activeTileIndex: 0 })); }
  function removeRaster(index: number) { if (state.rasters.length <= 1) return; setState(prevState => { const newRasters = prevState.rasters.filter((_, i) => i !== index); const newActiveIndex = Math.max(0, prevState.activeRasterIndex >= index ? prevState.activeRasterIndex - 1 : prevState.activeRasterIndex); return { ...prevState, rasters: newRasters, activeRasterIndex: newActiveIndex, activeTileIndex: 0 }; }); }
  function setActiveRaster(index: number, tileIndex: number = 0) { setState(s => ({ ...s, activeRasterIndex: index, activeTileIndex: tileIndex })); }
  function getActiveRaster() { return state.rasters[state.activeRasterIndex]; }

  function createNewProject() { const initial = getInitialProjectState(); setState(prev => ({ ...prev, ...initial, activeProjectId: null })); toast({ title: 'New Project Created' }); }
  
  async function saveProject() { 
    if (!user || !firestore) return; 
    const projectData = { 
      name: state.projectName, 
      description: state.projectDescription, 
      author: state.projectAuthor, 
      config: JSON.stringify(state) 
    }; 
    try { 
      if (state.activeProjectId) { 
        await updateProjectInDB(firestore, user.uid, state.activeProjectId, projectData); 
        toast({ title: 'Project Updated' }); 
      } else { 
        const id = await addProjectToDB(firestore, user.uid, projectData); 
        setState(prev => ({ ...prev, activeProjectId: id })); 
        toast({ title: 'Project Saved' }); 
      } 
      const userProjects = await getProjectsFromDB(firestore, user.uid);
      setState(prev => ({ ...prev, projects: userProjects }));
    } catch (e) { 
      toast({ variant: 'destructive', title: 'Save Failed' }); 
    } 
  }

  function loadProject(p: Project) { const loadedState = JSON.parse(p.config); setState(prev => ({ ...prev, ...loadedState, activeProjectId: p.id, ledProducts: prev.ledProducts, processors: prev.processors, mediaServers: prev.mediaServers })); toast({ title: 'Project Loaded' }); }
  
  async function deleteProject(id: string) { 
    if (!user || !firestore) return; 
    await deleteProjectFromDB(firestore, user.uid, id); 
    if (state.activeProjectId === id) setState(prev => ({ ...prev, activeProjectId: null })); 
    const userProjects = await getProjectsFromDB(firestore, user.uid);
    setState(prev => ({ ...prev, projects: userProjects }));
    toast({ title: 'Project Deleted' }); 
  }

  function handleAddManualLedAsset() {
    setState(prev => ({
        ...prev,
        deliverables: {
            ...prev.deliverables,
            externalLedAssets: [
                ...prev.deliverables.externalLedAssets,
                {
                    id: `manual-${Date.now()}`,
                    name: `NEW SCREEN`,
                    manufacturer: 'N/A',
                    product: 'N/A',
                    externalMapUrl: '',
                    externalMapResolution: '1920 x 1080',
                    aspect: '16:9',
                    color: PROJECTION_COLORS[Math.floor(Math.random() * PROJECTION_COLORS.length)]
                }
            ]
        }
    }));
    toast({ title: 'Manual Screen Added' });
  }

  const powerAndDataCalculations = useMemo(() => {
      const activeScreen = state.pixelMaps[state.activeScreenIndex];
      if (!activeScreen) return { totalPanels: 0, totalPixels: 0, screenResolutionX: 0, screenResolutionY: 0, panelsPerPort: 0, totalPortsNeeded: 0, totalProcessors: 1, voltage: 110, phase: '', panelsPer20A_Circuit: 0, totalCircuitsNeeded: 0, xdBoxCount: 0, heliosSwitchCount: 0, totalFullPanels: 0, totalHalfPanels: 0 };
      
      const { ledScreenWidth, ledScreenHeight, ledTileWidthPx, ledTileHeightPx, isMixed, ledScreenHalfWidth, ledScreenHalfHeight, ledHalfProduct, panelPowerMax } = activeScreen;
      const halfProductData = isMixed ? state.ledProducts.find(p => p.manufacturer === activeScreen.ledManufacturer && p.name === ledHalfProduct) : undefined;
      
      const totalFullPanels = ledScreenWidth * ledScreenHeight;
      const totalHalfPanels = isMixed ? (ledScreenHalfWidth * (ledScreenHeight + ledScreenHalfHeight)) + (ledScreenWidth * ledScreenHalfHeight) : 0;
      const totalPanels = totalFullPanels + totalHalfPanels;

      const screenResolutionX = (ledScreenWidth * ledTileWidthPx) + (isMixed && ledScreenHalfWidth > 0 ? (halfProductData ? halfProductData.width_px : ledTileWidthPx / 2) : 0);
      const screenResolutionY = (ledScreenHeight * ledTileHeightPx) + (isMixed && ledScreenHalfHeight > 0 ? (halfProductData ? halfProductData.height_px : ledTileHeightPx / 2) : 0);
      
      const totalPixels = screenResolutionX * screenResolutionY;
      
      const selectedProcessor = state.processors.find(p => p.id === state.power.processorType);
      const rateKey = state.power.refreshRate.replace(' Hz', '');
      const depthKey = state.power.colorDepth;
      
      const portCapacityData: any = selectedProcessor?.portCapacity || {};
      const rateCapacities: any = portCapacityData[rateKey] || { '8bit': { totalProcessorCapacity: 8847360, perPortCapacity: 655360 }, '10bit': { totalProcessorCapacity: 0, perPortCapacity: 0 }, '12bit': { totalProcessorCapacity: 0, perPortCapacity: 0 } };
      const capacities = rateCapacities[depthKey as keyof typeof rateCapacities] || { totalProcessorCapacity: 8847360, perPortCapacity: 655360 };

      const pixelsPerPanel = ledTileWidthPx * ledTileHeightPx;
      const panelsPerPort = pixelsPerPanel > 0 ? Math.floor(capacities.perPortCapacity / pixelsPerPanel) : 0;
      const totalPortsNeeded = panelsPerPort > 0 ? Math.ceil(totalPanels / panelsPerPort) : 0;
      
      let baseProcessors = 1;
      if (selectedProcessor) { 
          baseProcessors = Math.max(
              Math.ceil(totalPixels / (capacities.totalProcessorCapacity || 8847360)), 
              Math.ceil(totalPortsNeeded / selectedProcessor.portCount)
          ); 
      }

      const multiplier = state.power.useBackupProcessor ? 2 : 1;
      const totalProcessors = baseProcessors * multiplier;

      const xdBoxCount = ((selectedProcessor?.manufacturer.trim().toUpperCase() === 'BROMPTON' && selectedProcessor.name.trim().toUpperCase().includes('SX40')) 
        ? Math.ceil(totalPortsNeeded / 10) 
        : 0) * multiplier;
      
      const heliosSwitchCount = ((selectedProcessor?.manufacturer.trim().toUpperCase() === 'MEGAPIXEL' && selectedProcessor.name.trim().toUpperCase().includes('HELIOS'))
        ? Math.ceil(totalPortsNeeded / 10)
        : 0) * multiplier;

      const voltage = parseInt(state.power.operatingVoltage) || state.calculator.operatingVoltage;
      const isThreePhase = state.calculator.phaseConfiguration === 'three';
      const phaseDivisor = isThreePhase ? Math.sqrt(3) : 1;
      const maxAmpsPerPanel = voltage > 0 ? panelPowerMax / (voltage * phaseDivisor) : 0;
      const panelsPer20A_Circuit = maxAmpsPerPanel > 0 ? Math.floor(16 / maxAmpsPerPanel) : 0;
      const totalCircuitsNeeded = panelsPer20A_Circuit > 0 ? Math.ceil(totalPanels / panelsPer20A_Circuit) : 0;

      return { totalPanels, totalFullPanels, totalHalfPanels, totalPixels, screenResolutionX, screenResolutionY, panelsPerPort, totalPortsNeeded, totalProcessors, xdBoxCount, heliosSwitchCount, voltage, phase: isThreePhase ? '3Ø' : '1Ø', panelsPer20A_Circuit, totalCircuitsNeeded };
  }, [state.pixelMaps, state.activeScreenIndex, state.power, state.calculator, state.ledProducts, state.processors]);

  function handleAddOverlay() {
    setState(prevState => {
      const newPixelMaps = [...prevState.pixelMaps];
      const activeScreen = newPixelMaps[prevState.activeScreenIndex];
      if (!activeScreen) return prevState;

      const halfProductData = activeScreen.isMixed ? prevState.ledProducts.find(p => p.manufacturer === activeScreen.ledManufacturer && p.name === activeScreen.ledHalfProduct) : undefined;
      let totalWidthPx = activeScreen.ledScreenWidth * activeScreen.ledTileWidthPx;
      if (activeScreen.ledScreenHalfWidth > 0 && halfProductData) totalWidthPx += activeScreen.ledScreenHalfWidth * halfProductData.width_px;
      let totalHeightPx = activeScreen.ledScreenHeight * activeScreen.ledTileHeightPx;
      if (activeScreen.ledScreenHalfHeight > 0 && halfProductData) totalHeightPx += activeScreen.ledScreenHeight * halfProductData.height_px;
      
      const centerX = totalWidthPx / 2;
      const centerY = totalHeightPx / 2;
      const currentCount = activeScreen.overlayTexts.length;
      const verticalSpacing = 40;
      const newY = centerY + (currentCount * verticalSpacing);
      
      const newOverlay: OverlayText = { 
        id: Date.now(), 
        text: 'New Text', 
        color: '#FFFFFF', 
        fontSize: 24, 
        fontFamily: 'var(--font-space-mono), monospace',
        position: { x: centerX, y: newY } 
      };
      
      newPixelMaps[prevState.activeScreenIndex] = {
        ...activeScreen,
        overlayTexts: [...activeScreen.overlayTexts, newOverlay]
      };
      
      return { ...prevState, pixelMaps: newPixelMaps };
    });
  }

  const value = { state, setState, exportConfig, importConfig, addProduct, updateProduct, deleteProduct, addScreen, duplicateScreen, removeScreen, setActiveScreen, getActiveScreen, addRaster, duplicateRaster, removeRaster, setActiveRaster, getActiveRaster, getLayoutMetrics, powerAndDataCalculations, handleActiveScreenChange, handleCalculatorChange, saveProject, loadProject, deleteProject, createNewProject, handleAddManualLedAsset, handleAddOverlay, addProcessor, updateProcessor, deleteProcessor, addMediaServer, updateMediaServer, deleteMediaServer };
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjectContext Error');
  return context;
};
