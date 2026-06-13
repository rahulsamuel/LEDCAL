'use client';

import { LEDProduct } from '@/services/product-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Maximize, Zap, LayoutGrid, Ruler, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface ProductDetailsModalProps {
  product: LEDProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailsModal({ product, open, onOpenChange }: ProductDetailsModalProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] overflow-hidden">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-accent border-accent uppercase tracking-wider font-bold">
              {product.manufacturer}
            </Badge>
            {product.parent_id && <Badge variant="secondary">Half Panel</Badge>}
          </div>
          <DialogTitle className="text-3xl font-bold tracking-tight">{product.name}</DialogTitle>
          <DialogDescription>Technical Specifications & Hardware Limits</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-accent" /> Optical Specs
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Pixel Pitch</span>
                <span className="font-semibold">{product.pixel_pitch.toFixed(2)} mm</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Resolution</span>
                <span className="font-semibold">{product.width_px} × {product.height_px} px</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Usage</span>
                <Badge variant={product.usageType === 'outdoor' ? 'default' : 'secondary'} className="capitalize">{product.usageType}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Maximize className="w-4 h-4 text-accent" /> Physical Specs
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Dimensions</span>
                <span className="font-semibold">{product.width_mm} × {product.height_mm} mm</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Weight</span>
                <span className="font-semibold">{product.weight_kg.toFixed(1)} kg</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-sm text-muted-foreground">Floor Rated</span>
                <Badge variant={product.isFloor ? 'default' : 'outline'} className={product.isFloor ? 'bg-green-600 border-none' : ''}>
                  {product.isFloor ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Electrical
            </h4>
            <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Max Power</span>
                <span className="font-bold text-lg">{product.power_watts_max} W</span>
              </div>
              <Separator className="bg-border/50" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Power</span>
                <span className="font-semibold">{product.power_watts_avg} W</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Ruler className="w-4 h-4 text-accent" /> Rigging Limits
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center">
                <ArrowDownCircle className="w-5 h-5 mb-1 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Ground</span>
                <span className="font-bold text-lg">{product.max_tiles_ground || '—'}</span>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col items-center justify-center">
                <ArrowUpCircle className="w-5 h-5 mb-1 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Flown</span>
                <span className="font-bold text-lg">{product.max_tiles_flown || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
