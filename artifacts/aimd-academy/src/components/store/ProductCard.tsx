import { useState } from 'react';
import { StoreProduct } from '@workspace/api-client-react';
import { getProductImage, formatPrice } from './StoreUtils';
import { useCart } from './CartContext';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Eye, X } from 'lucide-react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';

export function QuickView({ product, open, onOpenChange }: { product: StoreProduct, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { addToCart } = useCart();
  const isOutOfStock = product.inventoryLabel === 'Out of Stock';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-card border-border rounded-none shadow-2xl">
        <DialogClose className="absolute right-4 top-4 z-50 rounded-none bg-background/50 backdrop-blur p-2 hover:bg-background transition-colors border border-border">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-muted border-r border-border overflow-hidden relative">
            <img 
              src={getProductImage(product.imageKey)} 
              alt={product.name} 
              className="w-full h-full object-cover" 
            />
            {product.featured && (
              <div className="absolute top-4 left-4 bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 shadow">
                Featured
              </div>
            )}
          </div>
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
            <div className="mb-6">
              <p className="font-mono text-xs uppercase text-primary mb-2 tracking-widest">{product.category}</p>
              <h2 className="font-display font-black uppercase text-2xl md:text-3xl mb-2">{product.name}</h2>
              <p className="font-mono text-xl font-bold text-foreground mb-4">{formatPrice(product.unitAmount)}</p>
              <div className="w-12 h-1 bg-primary mb-4" />
              <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
            </div>
            
            <div className="mt-auto space-y-4">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${isOutOfStock ? 'bg-destructive' : 'bg-green-500'}`} />
                <span className="font-mono text-xs uppercase text-muted-foreground">{product.inventoryLabel}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="flex-1 rounded-none uppercase font-mono font-bold tracking-widest h-12"
                  disabled={isOutOfStock}
                  onClick={() => {
                    addToCart(product);
                    onOpenChange(false);
                  }}
                >
                  {isOutOfStock ? "Sold Out" : "Add to Cart"}
                </Button>
                <Button 
                  size="lg" 
                  className="flex-1 rounded-none uppercase font-mono font-bold tracking-widest h-12 bg-primary hover:bg-primary/90 glow-coral text-primary-foreground"
                  disabled={isOutOfStock}
                  onClick={() => {
                    addToCart(product);
                    onOpenChange(false);
                  }}
                >
                  Add & View Cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProductCard({ product }: { product: StoreProduct }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { addToCart } = useCart();
  const isOutOfStock = product.inventoryLabel === 'Out of Stock';

  return (
    <>
      <div className="group flex flex-col border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors shadow-sm hover:shadow-md">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img 
            src={getProductImage(product.imageKey)} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            loading="lazy"
          />
          <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors duration-300" />
          
          {product.featured && (
            <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 shadow">
              Featured
            </div>
          )}
          
          {/* Quick actions overlay */}
          <div className="absolute inset-x-0 bottom-0 p-4 translate-y-0 opacity-100 md:translate-y-full md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 flex gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              className="flex-1 rounded-none font-mono text-[10px] uppercase font-bold bg-background/90 hover:bg-background text-foreground backdrop-blur border border-border"
              onClick={() => setQuickViewOpen(true)}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Quick View
            </Button>
            <Button 
              size="sm" 
              className="flex-1 rounded-none font-mono text-[10px] uppercase font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow"
              disabled={isOutOfStock}
              onClick={() => addToCart(product)}
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> {isOutOfStock ? "Out" : "Add"}
            </Button>
          </div>
        </div>
        
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="font-display font-black uppercase text-sm md:text-base leading-tight line-clamp-2">{product.name}</h3>
            <span className="font-mono text-sm font-bold shrink-0">{formatPrice(product.unitAmount)}</span>
          </div>
          <p className="font-mono text-[10px] uppercase text-muted-foreground mt-1 mb-3">{product.category}</p>
          <div className="mt-auto flex items-center justify-between">
            <span className={`font-mono text-[10px] uppercase ${isOutOfStock ? 'text-destructive' : 'text-green-600'}`}>
              {product.inventoryLabel}
            </span>
          </div>
        </div>
      </div>
      
      <QuickView product={product} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
    </>
  );
}
