
'use client';

import { useProjectContext, PowerState, CalculatorState, ProductFinderState, AspectRatioPreset, RasterMapState, DeliverablesState, ProjectionScreen, STRIP_GAP, PROJECTION_COLORS, PixelMapState } from '@/contexts/project-context';
import { SidebarContent, SidebarGroup, SidebarHeader } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Copy, Square, Ruler, Sigma, Footprints, MoveHorizontal, Plus, GitBranch, Zap, SquarePlus, X, Info, Layers, Layout, Monitor, Server, Construction, Check, RotateCcw, ArrowRight, ArrowLeft, ArrowDown, ArrowUp, FileOutput, Film, Volume2, Image as ImageIcon, Trash2, Upload, FileImage, MoreVertical, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel as SelectGroupLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import React, { useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LEDProduct } from '@/services/product-service';
import { Processor } from '@/services/processor-service';
import { MediaServer } from '@/services/media-server-service';
import { NewUserForm } from '@/components/features/auth/new-user-form';

interface SettingsPanelProps {
  activeTab: string;
}

const measurementUnits = [
    { id: 'px', label: 'Pixels', icon: Square },
    { id: 'tiles', label: 'Tiles', icon: Monitor },
    { id: 'ft', label: 'feet', icon: Footprints },
    { id: 'in', label: 'Inches', icon: Ruler },
    { id: 'm', label: 'Meters', icon: MoveHorizontal },
    { id: 'mm', label: 'Millimeters', icon: Sigma },
] as const;

const refreshRates = ['24 Hz', '25 Hz', '30 Hz', '48 Hz', '50 Hz', '60 Hz', '72 Hz', '100 Hz', '120 Hz', '144 Hz', '150 Hz', '180 Hz', '192 Hz', '200 Hz', '240 Hz', '250 Hz'];

const frameRateOptions = [
    '23.98fps', '24fps', '25fps', 
    '29.97fps DF', '29.97fps NDF', '30fps', 
    '48fps', '50fps', 
    '59.94fps DF', '59.94fps NDF', '60fps'
];
const codecOptions = ['NotchLC', 'DXV', 'HAP', 'H.265', 'ProRes 422', 'ProRes 4444', 'H.264', 'MPEG-2'];
const audioFormatOptions = ['Embedded', 'XLR (Analog)', 'Dante', 'MADI', 'AES/EBU'];
const audioSampleRateOptions = ['44.1kHz', '48kHz', '96kHz'];
const audioBitDepthOptions = ['16-bit', '24-bit', '32-bit (Float)'];
const imageFormatOptions = ['JPEG', 'PNG', 'TIFF', 'WebP'];

const aspectRatioOptions: { label: string; value: AspectRatioPreset; ratio: number }[] = [
    { label: '16:9 (Standard)', value: '16:9', ratio: 16 / 9 },
    { label: '16:10 (Widescreen)', value: '16:10', ratio: 16 / 10 },
    { label: '4:3 (Traditional)', value: '4:3', ratio: 4 / 3 },
    { label: '21:9 (Ultrawide)', value: '21:9', ratio: 21 / 9 },
    { label: '1:1 (Square)', value: '1:1', ratio: 1 },
    { label: '3:2 (Photography)', value: '3:2', ratio: 3 / 2 },
    { label: '5:4 (Monitor)', value: '5:4', ratio: 5 / 4 },
];

const fontOptions = [
    { label: 'Space Mono', value: 'var(--font-space-mono), monospace' },
    { label: 'Inter', value: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    { label: 'Courier New', value: '"Courier New", Courier, monospace' },
    { label: 'Arial Black', value: '"Arial Black", "Arial Bold", Gadget, sans-serif' },
    { label: 'Impact', value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
    { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
];

const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  width_px: z.coerce.number().min(1),
  height_px: z.coerce.number().min(1),
  width_mm: z.coerce.number().min(1),
  height_mm: z.coerce.number().min(1),
  pixel_pitch: z.coerce.number().min(0.1),
  weight_kg: z.coerce.number().min(0.1),
  power_watts_max: z.coerce.number().min(1),
  power_watts_avg: z.coerce.number().min(1),
  usageType: z.enum(['indoor', 'outdoor']),
  isFloor: z.boolean(),
  max_tiles_ground: z.coerce.number().min(0),
  max_tiles_flown: z.coerce.number().min(0),
});

const bitDepthCapacitySchema = z.object({
  totalProcessorCapacity: z.coerce.number().min(0),
  perPortCapacity: z.coerce.number().min(0),
});

const refreshRateCapacitiesSchema = z.object({
  '8bit': bitDepthCapacitySchema,
  '10bit': bitDepthCapacitySchema,
  '12bit': bitDepthCapacitySchema,
});

const portCapacitySchema = z.object({
  refreshRate: z.string().min(1, "Rate is required"),
  capacities: refreshRateCapacitiesSchema,
});

const processorFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  maxWidth: z.coerce.number().min(1),
  maxHeight: z.coerce.number().min(1),
  portCount: z.coerce.number().min(1),
  portCapacity: z.array(portCapacitySchema),
});

const mediaServerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  outputs: z.coerce.number().min(1),
  maxResolution: z.string().min(1, 'Resolution is required'),
  codecs: z.array(z.string()).min(1, 'At least one codec is required'),
  audio: z.string().min(1, 'Audio format is required'),
});

function AddProductForm() {
  const { addProduct } = useProjectContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '', manufacturer: '', width_px: 0, height_px: 0, width_mm: 0, height_mm: 0, pixel_pitch: 0, weight_kg: 0, power_watts_max: 0, power_watts_avg: 0, usageType: 'indoor', isFloor: false, max_tiles_ground: 0, max_tiles_flown: 0,
    },
  });

  async function onSubmit(data: z.infer<typeof productFormSchema>) {
    setIsSubmitting(true);
    try {
      await addProduct(data as Omit<LEDProduct, 'id'>);
      form.reset();
      toast({ title: 'Hardware Added', description: `${data.name} has been added to the library.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add product.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h3 className="text-base font-bold text-foreground">Add New Product</h3>
        
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel className="font-bold">Product Name</FormLabel>
            <FormControl><Input placeholder="e.g., Carbon CB5" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        
        <FormField control={form.control} name="manufacturer" render={({ field }) => (
          <FormItem>
            <FormLabel className="font-bold">Manufacturer</FormLabel>
            <FormControl><Input placeholder="e.g., ROE Visual" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="width_px" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Width (px)</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="height_px" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Height (px)</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="width_mm" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Width (mm)</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="height_mm" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Height (mm)</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="pixel_pitch" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Pixel Pitch (mm)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="weight_kg" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Weight (kg)</FormLabel>
              <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="power_watts_max" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Power (W) Max</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="power_watts_avg" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Power (W) Avg</FormLabel>
              <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="max_tiles_ground" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Max Tiles (Ground)</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="max_tiles_flown" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Max Tiles (Flown)</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <FormField
          control={form.control}
          name="usageType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="font-bold">Usage Type</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-4">
                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="indoor" /></FormControl><FormLabel className="font-normal cursor-pointer">Indoor</FormLabel></FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="outdoor" /></FormControl><FormLabel className="font-normal cursor-pointer">Outdoor</FormLabel></FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isFloor"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-muted/10">
              <div className="space-y-0.5">
                <FormLabel className="text-base font-bold">Floor Tile</FormLabel>
                <FormDescription className="text-xs">Is this product rated to be used as a floor?</FormDescription>
              </div>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 font-bold h-11">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Product"}
        </Button>
      </form>
    </Form>
  );
}

function AddProcessorForm() {
  const { addProcessor } = useProjectContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof processorFormSchema>>({
    resolver: zodResolver(processorFormSchema),
    defaultValues: {
      name: '', manufacturer: '', maxWidth: 0, maxHeight: 0, portCount: 0, portCapacity: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "portCapacity" });

  async function onSubmit(data: z.infer<typeof processorFormSchema>) {
    setIsSubmitting(true);
    try {
      const { portCapacity, ...rest } = data;
      const caps = portCapacity.reduce((acc, item) => {
          acc[item.refreshRate.replace(' Hz', '')] = item.capacities;
          return acc;
      }, {} as any);
      await addProcessor({ ...rest, portCapacity: caps });
      form.reset();
      toast({ title: 'Processor Added', description: `${data.name} added to the library.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add processor.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Processor Name</FormLabel>
              <FormControl><Input placeholder="e.g., SX40" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="manufacturer" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Manufacturer</FormLabel>
              <FormControl><Input placeholder="e.g., Brompton" {...field} /></FormControl>
            </FormItem>
          )} />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="maxWidth" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Max Width</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="maxHeight" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Max Height</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )} />
          </div>
          
          <FormField control={form.control} name="portCount" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Port Count</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/10">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider">Capacity by Refresh Rate</h4>
            <Button 
              type="button" 
              variant="default" 
              size="sm" 
              className="h-7 text-[9px] font-black uppercase tracking-widest bg-primary"
              onClick={() => append({ 
                refreshRate: '60 Hz', 
                capacities: { 
                  '8bit': { totalProcessorCapacity: 0, perPortCapacity: 0 }, 
                  '10bit': { totalProcessorCapacity: 0, perPortCapacity: 0 }, 
                  '12bit': { totalProcessorCapacity: 0, perPortCapacity: 0 } 
                } 
              })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Rate
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 rounded-lg bg-muted/20 border border-border relative">
                <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 rounded-full" onClick={() => remove(index)}><X className="h-3 w-3" /></Button>
                <div className="space-y-4">
                  <div className="space-y-1.5"><Label className="text-[10px] font-black text-muted-foreground uppercase">Refresh Rate</Label><Input {...form.register(`portCapacity.${index}.refreshRate`)} className="h-9 text-xs font-mono" /></div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[1fr,2fr,2fr] gap-2 text-[8px] font-black text-muted-foreground uppercase text-center border-b border-border pb-1">
                      <div className="text-left"></div><div>Total Cap</div><div>Per Port</div>
                    </div>
                    {(['8bit', '10bit', '12bit'] as const).map(depth => (
                      <div key={depth} className="grid grid-cols-[1fr,2fr,2fr] gap-2 items-center">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">{depth}</span>
                        <Input type="number" {...form.register(`portCapacity.${index}.capacities.${depth}.totalProcessorCapacity`)} className="h-8 text-[10px] px-1 font-mono text-center bg-background" />
                        <Input type="number" {...form.register(`portCapacity.${index}.capacities.${depth}.perPortCapacity`)} className="h-8 text-[10px] px-1 font-mono text-center bg-background" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-primary hover:bg-primary/90 font-black uppercase text-[10px] tracking-[0.2em] h-11">
          {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Add Processor
        </Button>
      </form>
    </Form>
  );
}

function AddMediaServerForm() {
  const { addMediaServer } = useProjectContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof mediaServerFormSchema>>({
    resolver: zodResolver(mediaServerFormSchema),
    defaultValues: {
      name: '', outputs: 4, maxResolution: '4K @ 60Hz', codecs: [], audio: 'Embedded',
    },
  });

  const selectedCodecs = form.watch('codecs');

  const toggleCodec = (codec: string) => {
    const current = [...selectedCodecs];
    const index = current.indexOf(codec);
    if (index === -1) {
      current.push(codec);
    } else {
      current.splice(index, 1);
    }
    form.setValue('codecs', current, { shouldValidate: true });
  };

  async function onSubmit(data: z.infer<typeof mediaServerFormSchema>) {
    setIsSubmitting(true);
    try {
      await addMediaServer(data);
      form.reset();
      toast({ title: 'Media Server Added', description: `${data.name} has been added to the library.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add media server.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h3 className="text-sm font-bold text-sidebar-foreground uppercase tracking-wider">Add New Media Server</h3>
        
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Server Name</FormLabel>
            <FormControl><Input placeholder="e.g., disguise vx 4" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="outputs" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Outputs</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="maxResolution" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Max Res</FormLabel>
              <FormControl><Input placeholder="4K @ 60Hz" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="audio" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Audio Support</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="h-10 bg-background border-border">
                  <SelectValue placeholder="Select Audio Format" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {audioFormatOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="space-y-2">
          <Label className="text-[10px] font-black text-muted-foreground uppercase">Supported Codecs</Label>
          <div className="grid grid-cols-2 gap-1">
            {codecOptions.map(codec => (
              <Button 
                key={codec} 
                type="button"
                size="sm" 
                variant={selectedCodecs.includes(codec) ? 'default' : 'secondary'}
                className="h-7 text-[9px] font-bold"
                onClick={() => toggleCodec(codec)}
              >
                {codec}
              </Button>
            ))}
          </div>
          {form.formState.errors.codecs && (
            <p className="text-[10px] text-destructive font-bold">{form.formState.errors.codecs.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 font-black uppercase text-[10px] tracking-[0.2em] h-11">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Add Server
        </Button>
      </form>
    </Form>
  );
}

export default function SettingsPanel({ activeTab }: SettingsPanelProps) {
  const { 
    state, setState, setActiveScreen, getActiveScreen, 
    setActiveRaster, getActiveRaster, getLayoutMetrics, addScreen, duplicateScreen, removeScreen, addRaster, duplicateRaster, removeRaster, handleActiveScreenChange, handleCalculatorChange, handleAddManualLedAsset, handleAddOverlay 
  } = useProjectContext();
  
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { calculator: calcState, power: powerState, productFinder, ledProducts, processors, mediaServers, activeScreenIndex, activeRasterIndex, activeTileIndex, pixelMaps, rasters, deliverables, mediaServer } = state;
  const activeScreen = getActiveScreen();
  const activeRaster = getActiveRaster();

  const isMfrSelected = !!activeScreen?.ledManufacturer && !!activeScreen?.ledProduct;
  const isAnyScreenConfigured = pixelMaps.some(p => p.ledManufacturer && (p.ledProduct || p.ledManufacturer === 'Custom'));
  const realManufacturers = useMemo(() => {
    const list = [...new Set(ledProducts.map(p => p.manufacturer))].sort();
    return ['Custom', ...list];
  }, [ledProducts]);
  const processorManufacturers = useMemo(() => [...new Set(processors.map(p => p.manufacturer))].sort(), [processors]);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setState((prevState) => {
      const newState = { ...prevState, [name]: value };
      if (name === 'projectName') {
        newState.deliverables = { ...prevState.deliverables, projectName: value };
      }
      return newState;
    });
  }

  function handlePowerChange(key: keyof PowerState, value: any) {
    setState((prevState) => ({ ...prevState, power: { ...prevState.power, [key]: value } }));
  }

  function handleFinderChange(key: keyof ProductFinderState, value: any) {
    setState((prevState) => ({ ...prevState, productFinder: { ...prevState.productFinder, [key]: value } }));
  }

  function handleRasterChange(key: keyof RasterMapState, value: any) {
    setState(prevState => {
      const newRasters = [...prevState.rasters];
      const current = newRasters[prevState.activeRasterIndex];
      if (current) {
        newRasters[prevState.activeRasterIndex] = { ...current, [key]: value };
      }
      return { ...prevState, rasters: newRasters };
    });
  }

  function handleRasterScreenSettingChange(screenId: string, key: string, value: any) {
    setState(prevState => {
      const newRasters = [...prevState.rasters];
      const current = newRasters[prevState.activeRasterIndex];
      if (current) {
        const newSettings = [...current.screenSettings];
        const idx = newSettings.findIndex(s => s.screenId === screenId);
        if (idx !== -1) {
          newSettings[idx] = { ...newSettings[idx], [key]: value };
        } else {
          newSettings.push({ screenId, positionX: 0, positionY: 0, nameFontSize: 16, [key]: value });
        }
        newRasters[prevState.activeRasterIndex] = { ...current, screenSettings: newSettings };
      }
      return { ...prevState, rasters: newRasters };
    });
  }

  function handleDeliverablesChange(key: string, value: any) {
    setState(prevState => {
      const newDeliverables = { ...prevState.deliverables, [key]: value };
      const newState = { ...prevState, deliverables: newDeliverables };
      if (key === 'projectName') {
        newState.projectName = value;
      }
      return newState;
    });
  }

  function toggleMultiSelect(key: 'selectedFrameRates' | 'selectedCodecs' | 'selectedAudioFormats' | 'selectedAudioSampleRates' | 'selectedAudioBitDepths' | 'selectedImageFormats', value: string) {
    setState(prevState => {
        const current = [...(prevState.deliverables[key] as string[])];
        const index = current.indexOf(value);
        if (index === -1) {
            current.push(value);
        } else {
            if (current.length > 1) current.splice(index, 1);
        }
        return { ...prevState, deliverables: { ...prevState.deliverables, [key]: current } };
    });
  }

  function toggleScreenAssignment(screenId: string, checked: boolean) {
    setState(prevState => {
      const newRasters = [...prevState.rasters];
      const current = newRasters[prevState.activeRasterIndex];
      if (current) {
        const newAssignments = { ...current.screenAssignments, [screenId]: checked };
        newRasters[prevState.activeRasterIndex] = { ...current, screenAssignments: newAssignments };
      }
      return { ...prevState, rasters: newRasters };
    });
  }

  const currentUnitLabel = measurementUnits.find(u => u.id === productFinder.measurementUnit)?.label.toLowerCase() || '';
  const currentSyncWidth = state.calculator.screenSizeUnits === 'tiles' ? state.calculator.screenWidth : (activeScreen ? activeScreen.ledScreenWidth + (activeScreen.ledScreenHalfWidth > 0 ? 0.5 : 0) : 0);
  const currentSyncHeight = state.calculator.screenSizeUnits === 'tiles' ? state.calculator.screenHeight : (activeScreen ? activeScreen.ledScreenHeight + (activeScreen.ledScreenHalfHeight > 0 ? 0.5 : 0) : 0);

  return (
    <SidebarContent className="p-0 bg-sidebar font-mono">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <h2 className="text-xl font-bold uppercase tracking-tight text-sidebar-foreground">
          {activeTab === 'getting-started' ? 'Project Information' : 
           activeTab === 'product-finder' ? 'LED Product Options' : 
           activeTab === 'led-calculator' ? 'LED Wall Calculator' :
           activeTab === 'power' ? 'Power & Data Settings' : 
           activeTab === 'pixel-map' ? 'Pixel Map Settings' : 
           activeTab === 'raster-map' ? 'Raster Map Settings' : 
           activeTab === 'wiring-diagram' ? 'Wiring Diagram Settings' : 
           activeTab === 'hardware-requirement' ? 'Hardware Requirements Settings' : 
           activeTab === 'media-server' ? 'Playback Settings' : 
           activeTab === 'content-deliverables' ? 'DELIVERABLE SETTINGS' : 
           activeTab === 'product-library' ? 'Product Library Options' :
           activeTab === 'processor-library' ? 'Processor Library Options' :
           activeTab === 'user-management' ? 'User Management Options' : 'Settings'}
        </h2>
      </SidebarHeader>

      {activeTab === 'getting-started' && (
        <SidebarGroup className="p-4 pt-2">
          <p className="text-[10px] text-muted-foreground mb-6 uppercase font-bold tracking-widest leading-relaxed">Manage general information about your project.</p>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-sidebar-foreground uppercase tracking-wider">Project Details</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-[10px] font-black text-muted-foreground uppercase">Project Name</Label><Input name="projectName" value={state.projectName} onChange={handleTextChange} placeholder="My LED Project" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black text-muted-foreground uppercase">Description (Optional)</Label><Textarea name="projectDescription" value={state.projectDescription} onChange={handleTextChange} placeholder="Enter project description" className="min-h-[100px] resize-none" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black text-muted-foreground uppercase">Author (Optional)</Label><Input name="projectAuthor" value={state.projectAuthor} onChange={handleTextChange} placeholder="Enter author name" /></div>
          </div>
        </SidebarGroup>
      )}

      {isAdmin && activeTab === 'product-library' && (
        <SidebarGroup className="p-4 space-y-6">
          <AddProductForm />
        </SidebarGroup>
      )}

      {isAdmin && activeTab === 'processor-library' && (
        <SidebarGroup className="p-4 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-sidebar-foreground uppercase tracking-wider">Add New Processor</h3>
          </div>
          <AddProcessorForm />
        </SidebarGroup>
      )}

      {isAdmin && activeTab === 'user-management' && (
        <SidebarGroup className="p-4 space-y-6">
          <NewUserForm />
        </SidebarGroup>
      )}

      {activeTab === 'product-finder' && (
        <SidebarGroup className="p-4 space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Product Type Filter</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={productFinder.productType === 'wall' ? 'default' : 'secondary'} className="h-10 text-[10px] font-bold uppercase" onClick={() => handleFinderChange('productType', 'wall')}>LED Wall</Button>
                <Button variant={productFinder.productType === 'floor' ? 'default' : 'secondary'} className="h-10 text-[10px] font-bold uppercase" onClick={() => handleFinderChange('productType', 'floor')}>LED Floor</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Input Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={productFinder.inputMethod === 'dimensions' ? 'default' : 'secondary'} className="h-10 text-[10px] font-bold uppercase" onClick={() => handleFinderChange('inputMethod', 'dimensions')}>Screen Dimensions</Button>
                <Button variant={productFinder.inputMethod === 'ratio' ? 'default' : 'secondary'} className="h-10 text-[10px] font-bold uppercase" onClick={() => handleFinderChange('inputMethod', 'ratio')}>Aspect Ratio</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Measurement Unit</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {measurementUnits.map((unit) => (
                  <Button key={unit.id} variant={productFinder.measurementUnit === unit.id ? 'default' : 'secondary'} className="h-9 text-[10px] font-bold uppercase tracking-tight" onClick={() => handleFinderChange('measurementUnit', unit.id)}>{unit.label}</Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Width ({currentUnitLabel})</Label><Input type="number" step="any" value={productFinder.width} onChange={(e) => handleFinderChange('width', +e.target.value)} className="bg-background border-border h-10" /></div>
              {productFinder.inputMethod === 'dimensions' && (
                <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Height ({currentUnitLabel})</Label><Input type="number" step="any" value={productFinder.height} onChange={(e) => handleFinderChange('height', +e.target.value)} className="bg-background border-border h-10" /></div>
              )}
            </div>

            {productFinder.inputMethod === 'ratio' && (
              <div className="space-y-4 pt-4 border-t border-sidebar-border">
                <div className="flex items-center justify-between"><Label className="text-xs font-bold uppercase tracking-wider">Custom Aspect Ratio</Label><Switch checked={productFinder.isCustomAspectRatio} onCheckedChange={(v) => handleFinderChange('isCustomAspectRatio', v)} /></div>
                {!productFinder.isCustomAspectRatio ? (
                  <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Preset Ratio</Label>
                    <Select value={productFinder.aspectRatioPreset} onValueChange={(v) => handleFinderChange('aspectRatioPreset', v)}>
                      <SelectTrigger className="h-10 bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>{aspectRatioOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">X Ratio</Label><Input type="number" step="any" value={productFinder.customAspectRatioX} onChange={(e) => handleFinderChange('customAspectRatioX', +e.target.value)} className="bg-background border-border h-10" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Y Ratio</Label><Input type="number" step="any" value={productFinder.customAspectRatioY} onChange={(e) => handleFinderChange('customAspectRatioY', +e.target.value)} className="bg-background border-border h-10" /></div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-sidebar-border">
                <div className="p-4 rounded-lg border border-border flex items-start justify-between gap-4 bg-muted/30">
                    <div className="space-y-1"><Label className="text-sm font-bold uppercase leading-none">Use Full Tiles Only</Label><p className="text-[10px] text-muted-foreground leading-tight">Exclude mixed panel configurations from search results.</p></div>
                    <Switch checked={productFinder.preferFullTiles} onCheckedChange={(v) => handleFinderChange('preferFullTiles', v)} />
                </div>
            </div>
          </div>
        </SidebarGroup>
      )}

      {(activeTab === 'led-calculator' || activeTab === 'power' || activeTab === 'pixel-map' || activeTab === 'wiring-diagram' || activeTab === 'hardware-requirement') && activeScreen && (
        <SidebarGroup className="p-4 space-y-6 border-b border-sidebar-border">
            <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Screen Configuration</Label>
                <div className="grid grid-cols-2 gap-1">
                    {pixelMaps.map((screen, idx) => (
                        <div key={screen.id} className="relative group/screen">
                            <Button variant={activeScreenIndex === idx ? 'default' : 'secondary'} className="h-8 w-full text-[10px] font-bold uppercase pl-2 pr-1 justify-between gap-1" onClick={() => setActiveScreen(idx)}>
                                <span className="truncate">{screen.name}</span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-black/10 focus-visible:ring-0"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32 font-mono uppercase text-[10px]">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateScreen(idx); }}><Copy className="mr-2 h-3 w-3" /> Duplicate</DropdownMenuItem>
                                        {pixelMaps.length > 1 && (<DropdownMenuItem onClick={(e) => { e.stopPropagation(); removeScreen(idx); }} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-3 w-3" /> Remove</DropdownMenuItem>)}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" className="h-8 w-full text-[10px] font-bold uppercase border-primary/50 text-primary hover:bg-primary/10 px-2" onClick={addScreen}><Plus className="h-3 w-3 mr-1" /> ADD</Button>
                </div>
            </div>
        </SidebarGroup>
      )}

      {activeTab === 'led-calculator' && activeScreen && (
        <SidebarGroup className="p-4 space-y-6">
            <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isMfrSelected ? "text-muted-foreground/50" : "text-muted-foreground")}>Screen Name</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" disabled={!isMfrSelected} value={activeScreen.name} onChange={(e) => handleActiveScreenChange('name', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label className="text-[10px] font-black text-muted-foreground uppercase">LED Manufacturer</Label>
                    <Select value={activeScreen.ledManufacturer} onValueChange={(v) => handleActiveScreenChange('ledManufacturer', v)}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{realManufacturers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !activeScreen.ledManufacturer ? "text-muted-foreground/50" : "text-muted-foreground")}>LED Product {activeScreen.isMixed && <span className="text-primary font-black ml-1">(MIXED)</span>}</Label>
                    <Select disabled={!activeScreen.ledManufacturer} value={activeScreen.ledProduct} onValueChange={(v) => handleActiveScreenChange('ledProduct', v)}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{ledProducts.filter(p => p.manufacturer === activeScreen.ledManufacturer).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-1.5 pt-4 border-t border-border mt-2"><Label className={cn("text-[10px] font-black uppercase", !isMfrSelected ? "text-muted-foreground/50" : "text-muted-foreground")}>Wall Shape</Label>
                <div className="grid grid-cols-3 gap-2">{['straight', 'concave', 'convex'].map(shape => (<Button key={shape} disabled={!isMfrSelected} variant={calcState.wallShape === shape ? 'default' : 'secondary'} onClick={() => handleCalculatorChange('wallShape', shape as any)} className="h-10 text-[10px] font-bold uppercase">{shape}</Button>))}</div>
            </div>
            <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isMfrSelected ? "text-muted-foreground/50" : "text-muted-foreground")}>Operating Voltage</Label>
                <div className="grid grid-cols-3 gap-2">{[110, 208, 230].map(v => (<Button key={v} disabled={!isMfrSelected} variant={calcState.operatingVoltage === v ? 'default' : 'secondary'} onClick={() => handleCalculatorChange('operatingVoltage', v as any)} className="h-10 text-[10px] font-bold uppercase">{v}V</Button>))}</div>
            </div>
            <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isMfrSelected ? "text-muted-foreground/50" : "text-muted-foreground")}>Phase Configuration</Label>
                <div className="grid grid-cols-2 gap-2">{[{ id: 'single', label: 'Single Phase' }, { id: 'three', label: 'Three Phase' }].map(phase => (<Button key={phase.id} disabled={!isMfrSelected} variant={calcState.phaseConfiguration === phase.id ? 'default' : 'secondary'} onClick={() => handleCalculatorChange('phaseConfiguration', phase.id as any)} className="h-10 text-[10px] font-bold uppercase">{phase.label}</Button>))}</div>
            </div>
            <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isMfrSelected ? "text-muted-foreground/50" : "text-muted-foreground")}>Screen Size Units</Label>
                <div className="grid grid-cols-3 gap-2">{measurementUnits.map((unit) => (<Button key={unit.id} disabled={!isMfrSelected} variant={calcState.screenSizeUnits === unit.id ? 'default' : 'secondary'} onClick={() => handleCalculatorChange('screenSizeUnits', unit.id)} className="h-8 text-[10px] font-bold uppercase tracking-tighter">{unit.label}</Button>))}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isMfrSelected ? "text-muted-foreground/50" : "text-muted-foreground")}>Screen Width ({calcState.screenSizeUnits})</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" disabled={!isMfrSelected} type="number" step="any" value={calcState.screenWidth} onChange={(e) => handleCalculatorChange('screenWidth', e.target.value)} /></div>
                <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isMfrSelected ? "text-muted-foreground/50" : "text-muted-foreground")}>Screen Height ({calcState.screenSizeUnits})</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" disabled={!isMfrSelected} type="number" step="any" value={calcState.screenHeight} onChange={(e) => handleCalculatorChange('screenHeight', e.target.value)} /></div>
            </div>
            <div className={cn("p-4 rounded-lg border border-border flex items-start justify-between gap-4", !isMfrSelected ? "opacity-50" : "bg-muted/30")}>
                <div className="space-y-1"><Label className={cn("text-sm font-bold uppercase leading-none")}>Use Full Tiles Only</Label><p className="text-[10px] text-muted-foreground leading-tight">Round to the nearest full tile instead of using half-panels.</p></div>
                <Switch disabled={!isMfrSelected} checked={calcState.preferFullTiles} onCheckedChange={(v) => handleCalculatorChange('preferFullTiles', v)} />
            </div>
        </SidebarGroup>
      )}

      {activeTab === 'raster-map' && activeRaster && (
        <SidebarGroup className="p-4 space-y-6">
            <div className="space-y-2 border-b border-sidebar-border pb-4">
                <Label className={cn("text-[10px] font-black uppercase tracking-widest", !isAnyScreenConfigured ? "text-muted-foreground/50" : "text-muted-foreground")}>Active Raster Layout</Label>
                <div className="space-y-1">
                    {rasters.flatMap((raster, layoutIdx) => {
                        const { numCols, numRows } = getLayoutMetrics(raster);
                        const totalOutputs = numCols * numRows;
                        return Array.from({ length: totalOutputs }).map((_, outputIdx) => {
                            const isActive = activeRasterIndex === layoutIdx && activeTileIndex === outputIdx;
                            const outputLabel = totalOutputs > 1 ? ` (Output ${outputIdx + 1})` : '';
                            return (
                                <div key={`${raster.id}-output-${outputIdx}`} className="relative group/raster">
                                    <Button disabled={!isAnyScreenConfigured} variant={isActive ? 'default' : 'secondary'} className="h-8 w-full text-[10px] font-bold uppercase pl-2 pr-1 justify-between gap-1" onClick={() => setActiveRaster(layoutIdx, outputIdx)}>
                                        <span className="truncate">{raster.name}{outputLabel}</span>
                                        {outputIdx === 0 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button disabled={!isAnyScreenConfigured} variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-black/10 focus-visible:ring-0"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-32 font-mono uppercase text-[10px]">
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateRaster(layoutIdx); }}><Copy className="mr-2 h-3 w-3" /> Duplicate</DropdownMenuItem>
                                                    {rasters.length > 1 && (<DropdownMenuItem onClick={(e) => { e.stopPropagation(); removeRaster(layoutIdx); }} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-3 w-3" /> Remove</DropdownMenuItem>)}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </Button>
                                </div>
                            );
                        });
                    })}
                    <Button disabled={!isAnyScreenConfigured} variant="outline" className="h-8 w-full text-[10px] font-bold uppercase border-primary/50 text-primary hover:bg-primary/10 px-2" onClick={addRaster}><Plus className="h-3 w-3 mr-1" /> ADD NEW LAYOUT</Button>
                </div>
            </div>
            <div className="space-y-4">
                <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isAnyScreenConfigured ? "text-muted-foreground/50" : "text-muted-foreground")}>Raster Name</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" disabled={!isAnyScreenConfigured} value={activeRaster.name} onChange={(e) => handleRasterChange('name', e.target.value)} /></div>
                <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className={cn("text-xs font-bold uppercase tracking-wider", !isAnyScreenConfigured ? "opacity-50" : "text-sidebar-foreground")}>Canvas Settings</h3>
                    <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isAnyScreenConfigured ? "text-muted-foreground/50" : "text-muted-foreground")}>Resolution Presets</Label>
                        <div className="grid grid-cols-2 gap-2">{['1080p', '4K UHD', 'DCI 4K', 'Custom'].map(preset => (<Button key={preset} disabled={!isAnyScreenConfigured} variant={activeRaster.resolutionPreset === preset ? 'default' : 'secondary'} className="h-8 text-[10px] font-bold uppercase" onClick={() => handleRasterChange('resolutionPreset', preset)}>{preset}</Button>))}</div>
                    </div>
                    {activeRaster.resolutionPreset === 'Custom' && (<div className="grid grid-cols-2 gap-2"><div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isAnyScreenConfigured ? "text-muted-foreground/50" : "text-muted-foreground")}>Width</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" disabled={!isAnyScreenConfigured} type="number" value={activeRaster.customWidth} onChange={(e) => handleRasterChange('customWidth', +e.target.value)} /></div><div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isAnyScreenConfigured ? "text-muted-foreground/50" : "text-muted-foreground")}>Height</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" disabled={!isAnyScreenConfigured} type="number" value={activeRaster.customHeight} onChange={(e) => handleRasterChange('customHeight', +e.target.value)} /></div></div>)}
                    <div className="space-y-1.5"><Label className={cn("text-[10px] font-black uppercase", !isAnyScreenConfigured ? "text-muted-foreground/50" : "text-muted-foreground")}>Background Color</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 p-1" disabled={!isAnyScreenConfigured} type="color" value={activeRaster.backgroundColor} onChange={(e) => handleRasterChange('backgroundColor', e.target.value)} /></div>
                    <div className="space-y-3 pt-2"><div className="flex items-center justify-between"><Label className={cn("text-xs font-bold uppercase", !isAnyScreenConfigured ? "opacity-50" : "text-sidebar-foreground")}>Show Screen Names</Label><Switch disabled={!isAnyScreenConfigured} checked={activeRaster.showScreenNames} onCheckedChange={(v) => handleRasterChange('showScreenNames', v)} /></div><div className="flex items-center justify-between"><Label className={cn("text-xs font-bold uppercase", !isAnyScreenConfigured ? "opacity-50" : "text-sidebar-foreground")}>Show Coordinates</Label><Switch disabled={!isAnyScreenConfigured} checked={activeRaster.showCoordinates} onCheckedChange={(v) => handleRasterChange('showCoordinates', v)} /></div><div className="flex items-center justify-between"><Label className={cn("text-xs font-bold uppercase", !isAnyScreenConfigured ? "opacity-50" : "text-sidebar-foreground")}>Show LED Tile Labels</Label><Switch disabled={!isAnyScreenConfigured} checked={activeRaster.showTileLabels} onCheckedChange={(v) => handleRasterChange('showTileLabels', v)} /></div></div>
                </div>
            </div>
        </SidebarGroup>
      )}

      {activeTab === 'media-server' && (
        <SidebarGroup className="p-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-sidebar-foreground uppercase tracking-wider">Playback Selection</h3>
              </div>
            </div>
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase">Select Media Server</Label>
                    <Select value={mediaServer.selectedServerId} onValueChange={(v) => setState(prev => ({ ...prev, mediaServer: { ...prev.mediaServer, selectedServerId: v } }))}>
                        <SelectTrigger className="h-10 bg-background border-border">
                            <SelectValue placeholder="Select Server" />
                        </SelectTrigger>
                        <SelectContent>
                            {mediaServers.map(server => (
                                <SelectItem key={server.id} value={server.id}>{server.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center justify-between gap-4">
                    <Label className="text-sm font-bold uppercase leading-none">Backup Server Needed?</Label>
                    <Switch checked={mediaServer.useBackupServer} onCheckedChange={(v) => setState(prev => ({ ...prev, mediaServer: { ...prev.mediaServer, useBackupServer: v } }))} />
                </div>
            </div>
            {isAdmin && (
              <div className="pt-6 border-t border-sidebar-border mt-2">
                <AddMediaServerForm />
              </div>
            )}
        </SidebarGroup>
      )}

      {activeTab === 'content-deliverables' && (
        <SidebarGroup className="p-4 pt-2">
          <p className="text-[10px] text-muted-foreground mb-6 uppercase font-bold tracking-widest leading-relaxed">CONFIGURE YOUR PROJECT TECHNICAL REPORT.</p>
          <div className="space-y-4 mb-8">
            <h3 className="text-sm font-bold text-sidebar-foreground uppercase tracking-wider">Include Configuration Types</h3>
            <div className="space-y-3">
                <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center justify-between gap-4"><Label className={cn("text-sm font-bold uppercase")}>LED Components</Label><Switch checked={deliverables.showLedSection} onCheckedChange={(v) => handleDeliverablesChange('showLedSection', v)} /></div>
                <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center justify-between gap-4"><Label className={cn("text-sm font-bold uppercase")}>Projection Components</Label><Switch checked={deliverables.showProjectionSection} onCheckedChange={(v) => handleDeliverablesChange('showProjectionSection', v)} /></div>
            </div>
          </div>
          <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4"><FileOutput className="w-5 h-5 text-primary" /><h3 className="text-sm font-bold text-sidebar-foreground uppercase tracking-wider">PROJECT HEADER</h3></div>
              <div className="space-y-4">
                  <div className="space-y-1.5"><Label className="text-[10px] font-black text-muted-foreground uppercase">Project Name</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" placeholder="e.g., Summer Tour 2025" value={deliverables.projectName} onChange={(e) => handleDeliverablesChange('projectName', e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5"><Label className="text-[10px] font-black text-muted-foreground uppercase">Project Number</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" placeholder="L100000" value={deliverables.projectNumber} onChange={(e) => handleDeliverablesChange('projectNumber', e.target.value)} /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-black text-muted-foreground uppercase">Version</Label><input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" placeholder="01" value={deliverables.projectVersion} onChange={(e) => handleDeliverablesChange('projectVersion', e.target.value)} /></div>
                  </div>
              </div>
          </div>
          <Separator className="my-6 border-border" />
          <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4"><Film className="w-5 h-5 text-primary" /><h3 className="text-sm font-bold text-sidebar-foreground uppercase tracking-wider">VIDEO SPECS</h3></div>
              <div className="space-y-4">
                  <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground uppercase">Frame Rates</Label><div className="grid grid-cols-2 gap-1">{frameRateOptions.map(rate => (<Button key={rate} size="sm" variant={deliverables.selectedFrameRates.includes(rate) ? 'default' : 'secondary'} className="h-7 text-[9px] font-bold" onClick={() => toggleMultiSelect('selectedFrameRates', rate)}>{rate}</Button>))}</div></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black text-muted-foreground uppercase">Codecs</Label><div className="grid grid-cols-2 gap-1">{codecOptions.map(codec => (<Button key={codec} size="sm" variant={deliverables.selectedCodecs.includes(codec) ? 'default' : 'secondary'} className="h-7 text-[9px] font-bold" onClick={() => toggleMultiSelect('selectedCodecs', codec)}>{codec}</Button>))}</div></div>
              </div>
          </div>
        </SidebarGroup>
      )}

      {activeTab === 'pixel-map' && activeScreen && (
        <SidebarGroup className="p-4 space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between"><h3 className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2", !activeScreen.ledProduct ? "opacity-50" : "")}><Monitor className="w-4 h-4" /> Overlay Texts</h3><Button disabled={!isMfrSelected} variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase border-primary/50 text-primary" onClick={handleAddOverlay}><Plus className="h-3 w-3 mr-1" /> Add</Button></div>
            {activeScreen.overlayTexts.length > 0 && (
                <div className="space-y-3">
                    {activeScreen.overlayTexts.map((ot, idx) => (
                        <div key={ot.id} className="p-3 rounded-lg bg-muted/50 border border-border space-y-2 relative group">
                            <Button disabled={!isMfrSelected} variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleActiveScreenChange('overlayTexts', activeScreen.overlayTexts.filter(t => t.id !== ot.id))}><X className="h-3 w-3" /></Button>
                            <input className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" disabled={!isMfrSelected} value={ot.text} onChange={(e) => { const newTexts = [...activeScreen.overlayTexts]; newTexts[idx].text = e.target.value; handleActiveScreenChange('overlayTexts', newTexts); }} placeholder="Text" />
                            <Select disabled={!isMfrSelected} value={ot.fontFamily || 'var(--font-space-mono), monospace'} onValueChange={(v) => { const newTexts = [...activeScreen.overlayTexts]; newTexts[idx].fontFamily = v; handleActiveScreenChange('overlayTexts', newTexts); }}>
                                <SelectTrigger className="h-8 text-[10px] uppercase bg-background border-border"><SelectValue placeholder="Font" /></SelectTrigger>
                                <SelectContent className="font-mono uppercase text-[10px]">{fontOptions.map(font => (<SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>))}</SelectContent>
                            </Select>
                            <div className="grid grid-cols-2 gap-2">
                                <input className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" disabled={!isMfrSelected} type="number" value={ot.fontSize} onChange={(e) => { const newTexts = [...activeScreen.overlayTexts]; newTexts[idx].fontSize = +e.target.value; handleActiveScreenChange('overlayTexts', newTexts); }} />
                                <input className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 p-1" disabled={!isMfrSelected} type="color" value={ot.color} onChange={(e) => { const newTexts = [...activeScreen.overlayTexts]; newTexts[idx].color = e.target.value; handleActiveScreenChange('overlayTexts', newTexts); }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </SidebarGroup>
      )}
    </SidebarContent>
  );
}
