'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '../ui/button';
import { Pencil, Trash2, Copy, Plus, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Processor } from '@/services/processor-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { useAuth } from '@/contexts/auth-context';

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

const processorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Processor name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  maxWidth: z.coerce.number().min(1),
  maxHeight: z.coerce.number().min(1),
  portCount: z.coerce.number().min(1),
  portCapacity: z.array(portCapacitySchema),
});

type ProcessorFormValues = z.infer<typeof processorSchema>;

function ProcessorEditForm({
  processor,
  onFinished,
}: {
  processor: Processor,
  onFinished: () => void,
}) {
  const { updateProcessor } = useProjectContext();
  const form = useForm<ProcessorFormValues>({
    resolver: zodResolver(processorSchema),
    defaultValues: {
      id: processor.id,
      name: processor.name,
      manufacturer: processor.manufacturer,
      maxWidth: processor.maxWidth,
      maxHeight: processor.maxHeight,
      portCount: processor.portCount,
      portCapacity: Object.entries(processor.portCapacity).map(([rate, caps]) => ({
        refreshRate: `${rate} Hz`,
        capacities: caps as any
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'portCapacity' });

  async function onSubmit(data: ProcessorFormValues) {
    if (data.id) {
        const { id, portCapacity, ...rest } = data;
        const caps = portCapacity.reduce((acc, item) => {
            acc[item.refreshRate.replace(' Hz', '')] = item.capacities;
            return acc;
        }, {} as any);
        await updateProcessor(id, { ...rest, portCapacity: caps });
        onFinished();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <ScrollArea className="flex-grow pr-6 -mr-6">
            <div className="space-y-6 pr-1 pb-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Processor Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="maxWidth" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Max Width</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="maxHeight" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Max Height</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
              </div>
              
              <FormField control={form.control} name="portCount" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black text-muted-foreground uppercase">Port Count</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Capacity by Refresh Rate</h4>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-[10px] font-bold uppercase border-primary/50 text-primary"
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

                <div className="space-y-6">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-3 rounded-lg bg-muted/30 border border-border relative">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => remove(index)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5 pr-6">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase">Refresh Rate</Label>
                                    <Input {...form.register(`portCapacity.${index}.refreshRate`)} className="h-8 text-xs bg-background" />
                                </div>

                                <div className="space-y-2">
                                    <div className="grid grid-cols-[1fr,2fr,2fr] gap-2 text-[8px] font-black text-muted-foreground uppercase text-center">
                                        <div className="text-left">Bit-Depth</div>
                                        <div>Total Capacity</div>
                                        <div>Per Port</div>
                                    </div>
                                    
                                    {(['8bit', '10bit', '12bit'] as const).map(depth => (
                                        <div key={depth} className="grid grid-cols-[1fr,2fr,2fr] gap-2 items-center">
                                            <span className="text-[10px] font-bold text-foreground">{depth.replace('bit', '-bit')}</span>
                                            <Input 
                                                type="number" 
                                                {...form.register(`portCapacity.${index}.capacities.${depth}.totalProcessorCapacity`)} 
                                                className="h-7 text-[10px] px-1 font-mono text-center bg-background" 
                                            />
                                            <Input 
                                                type="number" 
                                                {...form.register(`portCapacity.${index}.capacities.${depth}.perPortCapacity`)} 
                                                className="h-7 text-[10px] px-1 font-mono text-center bg-background" 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            </div>
        </ScrollArea>
        <div className="pt-4 flex-shrink-0"><Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Save Changes</Button></div>
      </form>
    </Form>
  );
}

export default function ProcessorLibrary() {
  const { state, deleteProcessor, addProcessor } = useProjectContext();
  const { isAdmin } = useAuth();
  const { processors } = state;
  const [editProcessor, setEditProcessor] = useState<Processor | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Processor | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  const groupedProcessors = useMemo(() => {
    return processors.reduce((acc, processor) => {
      const manufacturer = processor.manufacturer;
      if (!acc[manufacturer]) acc[manufacturer] = [];
      acc[manufacturer].push(processor);
      return acc;
    }, {} as Record<string, Processor[]>);
  }, [processors]);

  const confirmDelete = () => {
    if (deleteCandidate && deleteConfirmationInput === 'delete') {
      deleteProcessor(deleteCandidate.id);
      setIsDeleteDialogOpen(false);
      setDeleteCandidate(null);
    }
  };

  const handleDuplicate = async (proc: Processor) => {
    const { id, ...data } = proc;
    await addProcessor({ ...data, name: `${data.name} (Copy)` });
  };

  return (
    <div className="w-full h-full">
        <Card className="border border-border bg-card shadow-none overflow-hidden">
          <CardHeader className="px-6 py-8 border-b border-border">
            <CardTitle className="text-3xl font-bold text-foreground mb-2">Processor Library</CardTitle>
            <CardDescription className="text-muted-foreground">Browse and manage the list of available LED processors.</CardDescription>
          </CardHeader>
          <CardContent className="px-6">
            <Table>
                <TableHeader className="border-b border-border hover:bg-transparent">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Name</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Max Resolution</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px]">Port Count</TableHead>
                    {isAdmin && <TableHead className="text-right text-muted-foreground font-bold uppercase text-[10px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                {Object.entries(groupedProcessors).sort(([a], [b]) => a.localeCompare(b)).map(([manufacturer, procs]) => (
                  <TableBody key={manufacturer}>
                    <TableRow className="hover:bg-transparent border-none">
                        <TableCell colSpan={isAdmin ? 4 : 3} className="font-bold text-primary uppercase tracking-widest pt-8 pb-4">
                            {manufacturer}
                        </TableCell>
                    </TableRow>
                    {procs.sort((a, b) => a.name.localeCompare(b.name)).map((processor) => (
                      <TableRow key={processor.id} className="border-none hover:bg-muted/30 group transition-colors">
                        <TableCell className="font-bold text-foreground py-4">{processor.name}</TableCell>
                        <TableCell className="text-muted-foreground font-medium font-mono text-xs">{`${processor.maxWidth}x${processor.maxHeight}`}</TableCell>
                        <TableCell className="text-muted-foreground font-medium">{processor.portCount}</TableCell>
                        {isAdmin && (
                          <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleDuplicate(processor)} className="text-muted-foreground hover:text-foreground h-8 w-8"><Copy className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => setEditProcessor(processor)} className="text-muted-foreground hover:text-foreground h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => { setDeleteCandidate(processor); setIsDeleteDialogOpen(true); }} className="text-muted-foreground hover:text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
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
        <Dialog open={!!editProcessor} onOpenChange={(open) => !open && setEditProcessor(null)}>
          <DialogContent className="h-[90vh] flex flex-col bg-background border-border text-foreground max-w-xl">
              <DialogHeader><DialogTitle>Edit {editProcessor?.name}</DialogTitle></DialogHeader>
              <div className="flex-1 overflow-hidden">
                {editProcessor && <ProcessorEditForm processor={editProcessor} onFinished={() => setEditProcessor(null)} />}
              </div>
          </DialogContent>
        </Dialog>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent className="bg-background border-border text-foreground">
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        This will permanently delete <span className="font-bold text-foreground">{deleteCandidate?.name}</span>. 
                        Type <code className="bg-muted px-2 py-1 rounded-sm font-mono text-foreground text-xs">delete</code> to confirm.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input 
                    type="text" 
                    value={deleteConfirmationInput} 
                    onChange={(e) => setDeleteConfirmationInput(e.target.value)} 
                    placeholder='type "delete"' 
                    className="w-full bg-background border-border text-foreground h-8 text-sm" 
                    autoFocus 
                />
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteCandidate(null)} className="bg-transparent border-border text-foreground hover:bg-muted">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} disabled={deleteConfirmationInput !== 'delete'} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
