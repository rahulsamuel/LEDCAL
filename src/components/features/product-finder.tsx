'use client';

import { useProjectContext } from '@/contexts/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LEDProduct } from '@/services/product-service';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ProductDetailsModal } from './product-details-modal';

const MM_TO_INCHES = 0.0393701;
const MM_TO_FEET = 0.00328084;
const PIXELS_TOLERANCE = 100;
const MM_TOLERANCE = 250;

const gcd = (a: number, b: number): number => {
    a = Math.abs(a);
    b = Math.abs(b);
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
    
    if (fraction === 0) {
        return `${feet}' ${wholeInches}"`;
    }

    const sixteenths = Math.round(fraction * 16);
    if (sixteenths === 0) {
        return `${feet}' ${wholeInches}"`;
    }
    if (sixteenths === 16) {
        return `${feet}' ${wholeInches + 1}"`;
    }

    const divisor = gcd(sixteenths, 16);
    const numerator = sixteenths / divisor;
    const denominator = 16 / divisor;

    if (wholeInches === 0 && feet === 0) {
        return `${numerator}/${denominator}"`;
    } else if (wholeInches === 0) {
        return `${feet}' ${numerator}/${denominator}"`;
    } else {
        return `${feet}' ${wholeInches} ${numerator}/${denominator}"`;
    }
};


interface CalculationResult {
    product: LEDProduct;
    halfProduct?: LEDProduct;
    tilesX: number;
    tilesY: number;
    halfTilesX?: number;
    halfTilesY?: number;
    totalPanels: number;
    actualWidthPx: number;
    actualHeightPx: number;
    actualWidthMM: number;
    actualHeightMM: number;
    pixelDiff: number;
    physicalDiff: number;
    matchQuality: 'Exact Match' | 'Close Match' | 'Approximate Match';
    isMixed: boolean;
}


export default function ProductFinder() {
    const { state, setState } = useProjectContext();
    const { productFinder, ledProducts } = state;
    const manufacturers = ['all', ...[...new Set(ledProducts.map(p => p.manufacturer))].sort()];
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedResultForConfirmation, setSelectedResultForConfirmation] = useState<CalculationResult | null>(null);
    const [detailsProduct, setDetailsProduct] = useState<LEDProduct | null>(null);

    const handleFinderChange = <K extends keyof typeof productFinder>(
      key: K,
      value: (typeof productFinder)[K]
    ) => {
      setState((prevState) => ({
        ...prevState,
        productFinder: {
          ...prevState.productFinder,
          [key]: value,
        },
      }));
    };

    const handleMatchQualityChange = (quality: keyof typeof productFinder.matchQualityFilter, checked: boolean) => {
        handleFinderChange('matchQualityFilter', {
            ...productFinder.matchQualityFilter,
            [quality]: checked
        });
    };

    const convertToMM = (value: number, unit: typeof productFinder.measurementUnit) => {
        switch (unit) {
            case 'mm': return value;
            case 'm': return value * 1000;
            case 'in': return value / MM_TO_INCHES;
            case 'ft': return value / MM_TO_FEET;
            default: return value;
        }
    }
    
    const groupedAndSortedProducts = useMemo<Record<string, CalculationResult[]>>(() => {
        let targetWidth = 0;
        let targetHeight = 0;

        if (productFinder.inputMethod === 'dimensions') {
            targetWidth = productFinder.width;
            targetHeight = productFinder.height;
        } else { // ratio
            targetWidth = productFinder.width;
            const ratio = productFinder.isCustomAspectRatio 
                ? productFinder.customAspectRatioX / productFinder.customAspectRatioY
                : (() => {
                    const [x, y] = productFinder.aspectRatioPreset.split(':').map(Number);
                    return x / y;
                })();
            targetHeight = (isNaN(ratio) || ratio <= 0) ? productFinder.height : productFinder.width / ratio;
        }

        const targetWidthMM = productFinder.measurementUnit !== 'px' && productFinder.measurementUnit !== 'tiles' 
            ? convertToMM(targetWidth, productFinder.measurementUnit) : 0;
        const targetHeightMM = productFinder.measurementUnit !== 'px' && productFinder.measurementUnit !== 'tiles'
            ? convertToMM(targetHeight, productFinder.measurementUnit) : 0;

        
        const filteredProducts = ledProducts.filter(product => {
            if (product.parent_id) return false; // Exclude half panels from primary loop
            
            if(productFinder.manufacturerFilter !== 'all' && product.manufacturer !== productFinder.manufacturerFilter) {
                return false;
            }

            if(productFinder.searchQuery && !product.name.toLowerCase().includes(productFinder.searchQuery.toLowerCase())) {
                return false;
            }
            
            if (productFinder.productType === 'floor') {
                return product.isFloor;
            }

            return !product.isFloor; // Default to wall
        });

        const allResults: CalculationResult[] = [];

        filteredProducts.forEach(product => {
            const halfProduct = ledProducts.find(p => p.parent_id === product.id);

            // --- Calculation for full panels only ---
            {
                let tilesX = 0;
                let tilesY = 0;

                if (productFinder.measurementUnit === 'tiles') {
                    tilesX = Math.round(targetWidth);
                    tilesY = Math.round(targetHeight);
                } else if (productFinder.measurementUnit === 'px') {
                    tilesX = product.width_px > 0 ? Math.round(targetWidth / product.width_px) : 0;
                    tilesY = product.height_px > 0 ? Math.round(targetHeight / product.height_px) : 0;
                } else {
                    tilesX = product.width_mm > 0 ? Math.round(targetWidthMM / product.width_mm) : 0;
                    tilesY = product.height_mm > 0 ? Math.round(targetHeightMM / product.height_mm) : 0;
                }

                if (tilesX > 0 && tilesY > 0) {
                    const fullOnlyResult: CalculationResult = {
                        product,
                        tilesX,
                        tilesY,
                        totalPanels: tilesX * tilesY,
                        actualWidthPx: tilesX * product.width_px,
                        actualHeightPx: tilesY * product.height_px,
                        actualWidthMM: tilesX * product.width_mm,
                        actualHeightMM: tilesY * product.height_mm,
                        pixelDiff: productFinder.measurementUnit === 'px' ? Math.abs((tilesX * product.width_px) - targetWidth) + Math.abs((tilesY * product.height_px) - targetHeight) : 0,
                        physicalDiff: productFinder.measurementUnit !== 'px' && productFinder.measurementUnit !== 'tiles' ? Math.abs((tilesX * product.width_mm) - targetWidthMM) + Math.abs((tilesY * product.height_mm) - targetHeightMM) : 0,
                        matchQuality: 'Approximate Match',
                        isMixed: false,
                    };
                    
                    if (fullOnlyResult.pixelDiff === 0 && fullOnlyResult.physicalDiff === 0) {
                        fullOnlyResult.matchQuality = 'Exact Match';
                    } else if (fullOnlyResult.pixelDiff <= PIXELS_TOLERANCE || fullOnlyResult.physicalDiff <= MM_TOLERANCE) {
                        fullOnlyResult.matchQuality = 'Close Match';
                    }
                    
                    allResults.push(fullOnlyResult);
                }
            }


            // --- Calculation for mixed panels (if half panel exists) ---
            if (halfProduct && !productFinder.preferFullTiles) {
                const isPhysical = productFinder.measurementUnit !== 'px' && productFinder.measurementUnit !== 'tiles';
                const isHalfWidth = halfProduct.width_mm < product.width_mm;
                const isHalfHeight = halfProduct.height_mm < product.height_mm;
                
                if (isPhysical) {
                    // Scenario 1: Mixed Height
                    if (isHalfHeight) {
                        const tilesX = Math.round(targetWidthMM / product.width_mm);
                        const fullTilesY = Math.floor(targetHeightMM / product.height_mm);
                        const remainingHeightMM = targetHeightMM - (fullTilesY * product.height_mm);
                        const halfTilesY = halfProduct.height_mm > 0 ? Math.round(remainingHeightMM / halfProduct.height_mm) : 0;

                        if (tilesX > 0 && (fullTilesY > 0 || halfTilesY > 0)) {
                             const mixedResult: CalculationResult = {
                                product,
                                halfProduct,
                                tilesX: tilesX,
                                tilesY: fullTilesY,
                                halfTilesX: 0,
                                halfTilesY: halfTilesY,
                                totalPanels: (tilesX * fullTilesY) + (tilesX * halfTilesY),
                                actualWidthPx: tilesX * product.width_px,
                                actualHeightPx: (fullTilesY * product.height_px) + (halfTilesY * halfProduct.height_px),
                                actualWidthMM: tilesX * product.width_mm,
                                actualHeightMM: (fullTilesY * product.height_mm) + (halfTilesY * halfProduct.height_mm),
                                pixelDiff: 0,
                                physicalDiff: 0,
                                matchQuality: 'Approximate Match',
                                isMixed: true,
                            };
                            mixedResult.physicalDiff = Math.abs(mixedResult.actualWidthMM - targetWidthMM) + Math.abs(mixedResult.actualHeightMM - targetHeightMM);
                            if (mixedResult.physicalDiff === 0) mixedResult.matchQuality = 'Exact Match';
                            else if (mixedResult.physicalDiff <= MM_TOLERANCE) mixedResult.matchQuality = 'Close Match';
                            allResults.push(mixedResult);
                        }
                    }

                    // Scenario 2: Mixed Width
                    if (isHalfWidth) {
                        const tilesY = Math.round(targetHeightMM / product.height_mm);
                        const fullTilesX = Math.floor(targetWidthMM / product.width_mm);
                        const remainingWidthMM = targetWidthMM - (fullTilesX * product.width_mm);
                        const halfTilesX = halfProduct.width_mm > 0 ? Math.round(remainingWidthMM / halfProduct.width_mm) : 0;

                         if (tilesY > 0 && (fullTilesX > 0 || halfTilesX > 0)) {
                            const mixedResult: CalculationResult = {
                                product,
                                halfProduct,
                                tilesX: fullTilesX,
                                tilesY: tilesY,
                                halfTilesX: halfTilesX,
                                halfTilesY: 0,
                                totalPanels: (fullTilesX * tilesY) + (halfTilesX * tilesY),
                                actualWidthPx: (fullTilesX * product.width_px) + (halfTilesX * halfProduct.width_px),
                                actualHeightPx: tilesY * product.height_px,
                                actualWidthMM: (fullTilesX * product.width_mm) + (halfTilesX * halfProduct.width_mm),
                                actualHeightMM: tilesY * product.height_mm,
                                pixelDiff: 0,
                                physicalDiff: 0,
                                matchQuality: 'Approximate Match',
                                isMixed: true,
                            };
                            mixedResult.physicalDiff = Math.abs(mixedResult.actualWidthMM - targetWidthMM) + Math.abs(mixedResult.actualHeightMM - targetHeightMM);
                            if (mixedResult.physicalDiff === 0) mixedResult.matchQuality = 'Exact Match';
                            else if (mixedResult.physicalDiff <= MM_TOLERANCE) mixedResult.matchQuality = 'Close Match';
                            allResults.push(mixedResult);
                        }
                    }
                }
            }
        });
        
        const calculated = allResults.filter(result => {
             const { matchQualityFilter } = productFinder;
             if (result.matchQuality === 'Exact Match' && matchQualityFilter.exact) return true;
             if (result.matchQuality === 'Close Match' && matchQualityFilter.close) return true;
             if (result.matchQuality === 'Approximate Match' && matchQualityFilter.approximate) return true;
             return false;
        }).sort((a, b) => {
            return a.physicalDiff - b.physicalDiff;
        });

        // Group by manufacturer
        return calculated.reduce((acc, result) => {
            const manufacturer = result.product.manufacturer;
            if (!acc[manufacturer]) {
                acc[manufacturer] = [];
            }
            acc[manufacturer].push(result);
            return acc;
        }, {} as Record<string, CalculationResult[]>);

    }, [productFinder, ledProducts]);

  const handleOpenConfirmation = (result: CalculationResult) => {
    setSelectedResultForConfirmation(result);
    setIsConfirmModalOpen(true);
  };
  
  const handleConfirmSelection = (setActiveTab: (tab: string) => void) => {
    if (!selectedResultForConfirmation) return;
    const result = selectedResultForConfirmation;

    setState((prevState) => {
      const newPixelMaps = [...prevState.pixelMaps];
      const activeScreen = newPixelMaps[prevState.activeScreenIndex];
      if (activeScreen) {
        newPixelMaps[prevState.activeScreenIndex] = {
          ...activeScreen,
          ledManufacturer: result.product.manufacturer,
          ledProduct: result.product.name,
          ledScreenWidth: result.tilesX,
          ledScreenHeight: result.tilesY,
          isMixed: result.isMixed,
          ledScreenHalfWidth: result.halfTilesX || 0,
          ledScreenHalfHeight: result.halfTilesY || 0,
          ledHalfProduct: result.halfProduct?.name || '',
          ledTileWidthPx: result.product.width_px,
          ledTileHeightPx: result.product.height_px,
          panelWidthMM: result.product.width_mm,
          panelHeightMM: result.product.height_mm,
          panelWeight: result.product.weight_kg,
          panelPowerMax: result.product.power_watts_max,
          panelPowerAvg: result.product.power_watts_avg,
        }
      }

      return {
        ...prevState,
        pixelMaps: newPixelMaps,
        calculator: {
          ...prevState.calculator,
          screenSizeUnits: 'tiles',
          screenWidth: result.tilesX + ((result.halfTilesX || 0) > 0 ? 0.5 : 0),
          screenHeight: result.tilesY + ((result.halfTilesY || 0) > 0 ? 0.5 : 0),
        }
      }
    });

    setActiveTab('led-calculator');
    setIsConfirmModalOpen(false);
    setSelectedResultForConfirmation(null);
  };
  
  const getMatchQualityColor = (quality: CalculationResult['matchQuality']) => {
    switch(quality) {
        case 'Exact Match': return 'text-green-500';
        case 'Close Match': return 'text-yellow-500';
        case 'Approximate Match': return 'text-red-500';
    }
  }

  const hasProducts = Object.keys(groupedAndSortedProducts).length > 0;

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                  <CardTitle>Product Recommendations</CardTitle>
                  <CardDescription>
                      Based on your criteria, here are some suitable LED products and their optimal configurations.
                  </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 bg-muted/30 p-4 rounded-lg -m-2 sm:m-0">
                  <div className="space-y-2 min-w-[150px]">
                      <Label htmlFor="product-search">Search by Name</Label>
                      <Input 
                        id="product-search"
                        placeholder="e.g., Carbon CB5"
                        value={productFinder.searchQuery}
                        onChange={(e) => handleFinderChange('searchQuery', e.target.value)}
                      />
                  </div>
                  <div className="space-y-2 min-w-[150px]">
                      <Label>Filter by Manufacturer</Label>
                      <Select value={productFinder.manufacturerFilter} onValueChange={(value) => handleFinderChange('manufacturerFilter', value)}>
                          <SelectTrigger>
                              <SelectValue placeholder="Select Manufacturer" />
                          </SelectTrigger>
                          <SelectContent>
                              {manufacturers.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label>Filter by Match Quality</Label>
                      <div className="flex items-center flex-wrap gap-4 pt-2">
                          <div className="flex items-center gap-2">
                              <Checkbox id="exact-match" checked={productFinder.matchQualityFilter.exact} onCheckedChange={(checked) => handleMatchQualityChange('exact', !!checked)} />
                              <Label htmlFor="exact-match" className="text-green-500">Exact</Label>
                          </div>
                          <div className="flex items-center gap-2">
                              <Checkbox id="close-match" checked={productFinder.matchQualityFilter.close} onCheckedChange={(checked) => handleMatchQualityChange('close', !!checked)} />
                              <Label htmlFor="close-match" className="text-yellow-500">Close</Label>
                          </div>
                          <div className="flex items-center gap-2">
                              <Checkbox id="approx-match" checked={productFinder.matchQualityFilter.approximate} onCheckedChange={(checked) => handleMatchQualityChange('approximate', !!checked)} />
                              <Label htmlFor="approx-match" className="text-red-500">Approx.</Label>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasProducts ? (
            <ScrollArea className="h-[65vh] pr-4">
              <div className="space-y-6">
                {Object.entries(groupedAndSortedProducts).sort(([a], [b]) => a.localeCompare(b)).map(([manufacturer, results]) => (
                  <div key={manufacturer}>
                    <h3 className="text-xl font-bold mb-3 text-blue-500">{manufacturer}</h3>
                    <div className="space-y-4">
                      {results.map((result, index) => (
                        <Card key={`${result.product.id}-${result.isMixed}-${index}`} className="overflow-hidden">
                            <CardHeader className="flex flex-row items-start justify-between gap-4 bg-muted/30 p-4">
                                <div className="flex-1">
                                    <CardTitle className="text-xl">
                                        <button 
                                            onClick={() => setDetailsProduct(result.product)}
                                            className="text-left hover:underline flex items-center gap-2 focus:outline-none"
                                        >
                                            {result.product.name}
                                            {result.isMixed && (
                                                <Badge variant="default" className='bg-purple-600'>
                                                    {result.halfTilesX && result.halfTilesX > 0 ? 'Mixed Width' : 'Mixed Height'}
                                                </Badge>
                                            )}
                                        </button>
                                    </CardTitle>
                                    <p className={`text-sm font-semibold ${getMatchQualityColor(result.matchQuality)}`}>~ {result.matchQuality}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button onClick={() => handleOpenConfirmation(result)}>Select</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 flex flex-wrap gap-x-6 gap-y-4 text-sm">
                                <div className="space-y-1">
                                    <p className="font-semibold text-muted-foreground">Tile Configuration</p>
                                    {(result.tilesX > 0 || result.tilesY > 0) && (
                                        <p>Full: {result.tilesX > 0 ? `${result.tilesX} × ${result.tilesY}` : 'N/A'}</p>
                                    )}
                                    {(result.halfTilesX || 0) > 0 && (
                                        <p>Half: {result.halfTilesX} &times; {result.tilesY}</p>
                                    )}
                                     {(result.halfTilesY || 0) > 0 && (
                                        <p>Half: {result.tilesX} &times; {result.halfTilesY}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">({result.totalPanels} total panels)</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-muted-foreground">Pixel Pitch</p>
                                    <p>{result.product.pixel_pitch.toFixed(2)}mm</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-muted-foreground">Actual Pixel Resolution</p>
                                    <p>{result.actualWidthPx} &times; {result.actualHeightPx} pixels</p>
                                    <p className="text-xs text-muted-foreground">Aspect Ratio: {(result.actualWidthPx / result.actualHeightPx).toFixed(3)}:1</p>
                                </div>
                                
                                <div className="space-y-1">
                                    <p className="font-semibold text-muted-foreground">Physical Size (Metric)</p>
                                    <p>{result.actualWidthMM.toFixed(1)} &times; {result.actualHeightMM.toFixed(1)} mm</p>
                                    <p className="text-xs text-muted-foreground">{(result.actualWidthMM/1000).toFixed(3)} &times; {(result.actualHeightMM/1000).toFixed(3)} m</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-muted-foreground">Physical Size (Imperial)</p>
                                    <p>{toFeetAndFractionalInches(result.actualWidthMM * MM_TO_INCHES)} &times; {toFeetAndFractionalInches(result.actualHeightMM * MM_TO_INCHES)}</p>
                                    <p className="text-xs text-muted-foreground">({(result.actualWidthMM * MM_TO_FEET).toFixed(2)} &times; {(result.actualWidthMM * MM_TO_FEET).toFixed(2)} ft)</p>
                                </div>
                                
                                { (result.pixelDiff > 0 || result.physicalDiff > 0) &&
                                  <>
                                   <Separator className="my-2 basis-full h-px"/>
                                    <div className="space-y-1 col-span-full">
                                        <p className="font-semibold text-muted-foreground">Difference from target</p>
                                        <p className="text-xs">
                                        {result.pixelDiff > 0 && `${result.pixelDiff.toFixed(0)} pixels, `}
                                        {result.physicalDiff > 0 && `
                                            ${result.physicalDiff.toFixed(0)}mm, 
                                            ${(result.physicalDiff * MM_TO_INCHES).toFixed(1)}", 
                                            ${(result.physicalDiff * MM_TO_FEET).toFixed(2)}'`
                                        }
                                        </p>
                                    </div>
                                   </>
                                }

                            </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No products found for the specified criteria.</p>
              <p className="text-sm">Try adjusting the filters in the sidebar.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ProductDetailsModal 
        product={detailsProduct}
        open={!!detailsProduct}
        onOpenChange={(open) => !open && setDetailsProduct(null)}
      />

      {selectedResultForConfirmation && (
        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Product Selection</DialogTitle>
                    <DialogDescription>
                        You have selected the following product. Would you like to proceed to the LED Calculator with this configuration?
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm bg-muted/50 p-4 rounded-md">
                    <p><span className="font-semibold">Manufacturer:</span> {selectedResultForConfirmation.product.manufacturer}</p>
                    <p><span className="font-semibold">Product:</span> {selectedResultForConfirmation.product.name} {selectedResultForConfirmation.isMixed ? '(Mixed)' : ''}</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                    <Button onClick={() => handleConfirmSelection(state.setActiveTab)}>Confirm & Proceed</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
