import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';
import { getProductImage, formatPrice } from './StoreUtils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';

export function CartDrawer() {
  const {
    isCartOpen,
    closeCart,
    items,
    updateQuantity,
    removeFromCart,
    subtotal,
    shippingTotal,
    total,
    hasPhysicalItems,
  } = useCart();

  useEffect(() => {
    if (!isCartOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeCart, isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity animate-in fade-in" 
        onClick={closeCart} 
        aria-hidden="true" 
      />
      
      <div
        className="fixed inset-y-0 right-0 w-full md:w-[420px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="font-display font-black uppercase tracking-tight text-xl">Your Cart</h2>
          </div>
          <button
            onClick={closeCart}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Close shopping cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-mono text-sm uppercase">Your cart is empty.</p>
              <Button variant="outline" className="mt-6 rounded-none font-mono text-xs uppercase" onClick={closeCart}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {items.map((item) => (
                <div key={item.product.priceId} className="flex gap-4">
                  <div className="w-20 h-20 shrink-0 bg-muted overflow-hidden border border-border">
                    <img 
                      src={getProductImage(item.product.imageKey)} 
                      alt={item.product.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-sm uppercase truncate">{item.product.name}</h3>
                        <p className="text-xs text-muted-foreground">{item.product.category}</p>
                      </div>
                      <p className="font-mono text-sm font-bold text-primary shrink-0">
                        {formatPrice(item.product.unitAmount)}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-border">
                        <button 
                          className="px-2 py-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => updateQuantity(item.product.priceId, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-mono text-xs">{item.quantity}</span>
                        <button 
                          className="px-2 py-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => updateQuantity(item.product.priceId, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.product.priceId)}
                        className="text-xs font-mono text-muted-foreground hover:text-destructive underline uppercase"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <div className="border-t border-border bg-background p-6">
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatPrice(subtotal)}</span>
              </div>
              
              {hasPhysicalItems && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-mono">
                    {shippingTotal === 0 ? <span className="text-primary font-bold">FREE</span> : formatPrice(shippingTotal)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between font-bold pt-2 border-t border-border">
                <span className="uppercase">Total</span>
                <span className="font-mono text-primary">{formatPrice(total)}</span>
              </div>
            </div>
            
            <p className="mb-4 text-center text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Online checkout is coming soon. Your cart will stay saved on this device.
            </p>
            <Button
              disabled
              className="w-full rounded-none h-12 uppercase font-mono font-bold tracking-widest"
            >
              Checkout Coming Soon
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
