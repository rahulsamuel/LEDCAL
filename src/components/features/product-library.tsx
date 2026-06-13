'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '../ui/button';
import { Pencil, Trash2, Copy, Plus, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { LEDProduct } from '@/services/product-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductDetailsModal } from './product-details-modal';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

const productSchema = z.object({
  id: z.string().optional(),
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
  parent_id: z.string().optional(),
  max_tiles_ground: z.coerce.number().min(0),
  max_tiles_flown: z.coerce.number().min(0),
});

type ProductFormValues = z.infer<typeof productSchema>;

function ProductEditForm({ 
  product, 
  onFinished,
  allProducts,
}: { 
  product: Partial<LEDProduct>, 
  onFinished: () => void,
  allProducts: LEDProduct[],
}) {
  const { updateProduct } = useProjectContext();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: product.id || '',
      name: product.name || '',
      manufacturer: product.manufacturer || '',
      width_px: product.width_px || 0,
      height_px: product.height_px || 0,
      width_mm: product.width_mm || 0,
      height_mm: product.height_mm || 0,
      pixel_pitch: product.pixel_pitch || 0,
      weight_kg: product.weight_kg || 0,
      power_watts_max: product.power_watts_max || 0,
      power_watts_avg: product.power_watts_avg || 0,
      usageType: (product.usageType as 'indoor' | 'outdoor') || 'indoor',
      isFloor: product.isFloor || false,
      parent_id: product.parent_id || '',
      max_tiles_ground: product.max_tiles_ground || 0,
      max_tiles_flown: product.max_tiles_flown || 0,
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    if (data.id) {
      await updateProduct(data.id, data as LEDProduct);
      onFinished();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <ScrollArea className="flex-grow pr-6 -mr-6">
            <div className="space-y-4 pr-1">
              <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Product Name</FormLabel><FormControl><Input placeholder="e.g., Carbon CB5" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Manufacturer</FormLabel><FormControl><Input placeholder="e.g., ROE Visual" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="width_px" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Width (px)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="height_px" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Height (px)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="width_mm" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Width (mm)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="height_mm" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Height (mm)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="pixel_pitch" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Pixel Pitch (mm)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="weight_kg" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Weight (kg)</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="power_watts_max" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Power (W) Max</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="power_watts_avg" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Power (W) Avg</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <FormField control={form.control} name="max_tiles_ground" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Max Tiles (Ground)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="max_tiles_flown" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Max Tiles (Flown)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
              </div>
              
              <FormField
                control={form.control}
                name="usageType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Usage Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center gap-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="indoor" />
                          </FormControl>
                          <FormLabel className="font-normal text-xs">Indoor</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="outdoor" />
                          </FormControl>
                          <FormLabel className="font-normal text-xs">Outdoor</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFloor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-bold uppercase">Floor Tile</FormLabel>
                      <p className="text-[10px] text-muted-foreground">Is this product rated to be used as a floor?</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
        </ScrollArea>
        <div className="pt-4 flex-shrink-0"><Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button></div>
      </form>
    </Form>
  );
}

export default function ProductLibrary() {
  const { state, addProduct, deleteProduct } = useProjectContext();
  const { isAdmin } = useAuth();
  const { ledProducts } = state;
  const [editProduct, setEditProduct] = useState<LEDProduct | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<LEDProduct | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<LEDProduct | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const groupedProducts = useMemo(() => {
    return ledProducts.reduce((acc, product) => {
      const manufacturer = product.manufacturer;
      if (!acc[manufacturer]) acc[manufacturer] = [];
      acc[manufacturer].push(product);
      return acc;
    }, {} as Record<string, LEDProduct[]>);
  }, [ledProducts]);

  const confirmDelete = () => {
    if (deleteCandidate && deleteConfirmationInput === 'delete') {
      deleteProduct(deleteCandidate.id);
      setIsDeleteDialogOpen(false);
      setDeleteCandidate(null);
    }
  };

  const handleDuplicate = async (product: LEDProduct) => {
    const { id, ...data } = product;
    await addProduct({ ...data, name: `${data.name} (Copy)` });
  };

  return (
    <div className="w-full h-full">
        <Card className="border border-border bg-card shadow-none overflow-hidden">
          <CardHeader className="px-6 py-8 border-b border-border rounded-t-lg">
            <CardTitle className="text-3xl font-bold text-foreground mb-2">Product Library</CardTitle>
            <CardDescription className="text-muted-foreground">Browse and manage the list of available LED products.</CardDescription>
          </CardHeader>
          <CardContent className="px-6">
            <Table>
                <TableHeader className="border-b border-border">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Name</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Pixel Pitch</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Resolution (px)</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Dimensions (mm)</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Weight (kg)</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Max Tiles (Ground)</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Max Tiles (Flown)</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Usage</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Floor?</TableHead>
                    {isAdmin && <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                {Object.entries(groupedProducts).sort(([a], [b]) => a.localeCompare(b)).map(([manufacturer, products]) => (
                  <TableBody key={manufacturer}>
                    <TableRow className="hover:bg-transparent border-none"><TableCell colSpan={isAdmin ? 10 : 9} className="font-bold text-primary uppercase tracking-widest pt-8 pb-4">{manufacturer.toUpperCase()}</TableCell></TableRow>
                    {products.sort((a, b) => a.name.localeCompare(b.name)).map((product) => (
                      <TableRow key={product.id} className="border-none hover:bg-muted/30 group transition-colors">
                        <TableCell className="font-bold text-foreground py-4">
                            <button onClick={() => setDetailsProduct(product)} className="hover:underline text-left flex items-center gap-2 focus:outline-none">
                                {product.name}{product.parent_id && <Badge variant="secondary" className="text-[9px] py-0 h-3 bg-muted text-muted-foreground border-none">Half</Badge>}
                            </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{product.pixel_pitch.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">{`${product.width_px}x${product.height_px}`}</TableCell>
                        <TableCell className="text-muted-foreground">{`${product.width_mm}x${product.height_mm}`}</TableCell>
                        <TableCell className="text-muted-foreground">{product.weight_kg.toFixed(1)}</TableCell>
                        <TableCell className="text-muted-foreground">{product.max_tiles_ground || 0}</TableCell>
                        <TableCell className="text-muted-foreground">{product.max_tiles_flown || 0}</TableCell>
                        <TableCell>
                            <Badge className={cn(
                                "text-[10px] uppercase font-bold border-none",
                                product.usageType === 'outdoor' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                                {product.usageType}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{product.isFloor ? 'Yes' : 'No'}</TableCell>
                        {isAdmin && (
                          <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleDuplicate(product)} title="Duplicate Product" className="text-muted-foreground hover:text-foreground h-8 w-8"><Copy className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => setEditProduct(product)} className="text-muted-foreground hover:text-foreground h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => { setDeleteCandidate(product); setIsDeleteDialogOpen(true); }} className="text-muted-foreground hover:text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                ))}
            </Table>
          </CardContent>
        </Card>
        <ProductDetailsModal product={detailsProduct} open={!!detailsProduct} onOpenChange={(open) => !open && setDetailsProduct(null)} />
        <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
          <DialogContent className="h-[90vh] flex flex-col bg-background border-border text-foreground max-w-xl">
              <DialogHeader><DialogTitle>Edit {editProduct?.name}</DialogTitle></DialogHeader>
              <div className="flex-1 overflow-hidden">{editProduct && <ProductEditForm product={editProduct} onFinished={() => setEditProduct(null)} allProducts={ledProducts} />}</div>
          </DialogContent>
        </Dialog>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent className="bg-background border-border text-foreground">
                <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">This will permanently delete <span className="font-bold text-foreground">{deleteCandidate?.name}</span>. Type <code className="bg-muted px-2 py-1 rounded-sm font-mono text-foreground text-xs">delete</code> to confirm.</AlertDialogDescription></AlertDialogHeader>
                <Input type="text" value={deleteConfirmationInput} onChange={(e) => setDeleteConfirmationInput(e.target.value)} placeholder='type "delete"' className="w-full bg-background border-border text-foreground h-8 text-sm" autoFocus />
                <AlertDialogFooter><AlertDialogCancel onClick={() => setDeleteCandidate(null)} className="bg-transparent border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} disabled={deleteConfirmationInput !== 'delete'} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
