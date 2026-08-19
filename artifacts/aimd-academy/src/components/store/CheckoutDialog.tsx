import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@clerk/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from './CartContext';
import {
  getGetStoreOrderQueryKey,
  StorePaymentIntentInput,
  useCreateStorePaymentIntent,
  useGetStoreOrder,
} from '@workspace/api-client-react';
import { formatPrice } from './StoreUtils';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const infoSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

type InfoFormValues = z.infer<typeof infoSchema>;

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // Required but we handle redirect: 'if_required'
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? 'An unknown error occurred');
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {errorMessage && (
        <div className="p-3 text-sm font-mono text-destructive bg-destructive/10 border border-destructive/20">
          {errorMessage}
        </div>
      )}
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full rounded-none h-12 uppercase font-mono font-bold tracking-widest bg-primary hover:bg-primary/90 glow-coral"
      >
        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Purchase"}
      </Button>
    </form>
  );
}

function OrderConfirmationPoller({ token, onClose }: { token: string; onClose: () => void }) {
  const { data: order, isLoading } = useGetStoreOrder(token, {
    query: {
      enabled: Boolean(token),
      queryKey: getGetStoreOrderQueryKey(token),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (
          status === 'paid'
          || status === 'failed'
          || status === 'canceled'
          || status === 'refunded'
          || status === 'disputed'
        ) return false;
        return 2000; // poll every 2s
      },
    }
  });

  const { clearCart } = useCart();
  const clearedRef = useRef(false);

  useEffect(() => {
    if (order?.status === 'paid' && !clearedRef.current) {
      clearCart();
      clearedRef.current = true;
    }
  }, [order?.status, clearCart]);

  const failed = order && ['failed', 'canceled', 'refunded', 'disputed'].includes(order.status);

  if (isLoading || !order || (order.status !== 'paid' && !failed)) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <h3 className="font-display font-black uppercase text-xl">Processing Payment</h3>
        <p className="text-muted-foreground font-mono text-xs">Please do not close this window.</p>
      </div>
    );
  }

  if (order.status === 'paid') {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h3 className="font-display font-black uppercase text-2xl text-green-500">Order Confirmed</h3>
        <p className="text-muted-foreground">Thank you for supporting AIMD. Your receipt has been sent to {order.customerEmail}.</p>
        <Button onClick={onClose} className="mt-4 rounded-none uppercase font-mono font-bold">
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
      <h3 className="font-display font-black uppercase text-xl text-destructive">Payment Failed</h3>
      <p className="text-muted-foreground">Something went wrong with your order. Please try again.</p>
      <Button onClick={onClose} variant="outline" className="mt-4 rounded-none uppercase font-mono font-bold">
        Close
      </Button>
    </div>
  );
}

export function CheckoutDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { items, hasPhysicalItems, subtotal, shippingTotal, total } = useCart();
  const { user } = useUser();
  const createPaymentIntent = useCreateStorePaymentIntent();
  
  const [step, setStep] = useState<'info' | 'payment' | 'processing'>('info');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderToken, setOrderToken] = useState<string | null>(null);

  const form = useForm<InfoFormValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      email: user?.primaryEmailAddress?.emailAddress || '',
      name: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    }
  });

  // Reset dialog state when opened
  useEffect(() => {
    if (open) {
      setStep('info');
      setClientSecret(null);
      setOrderToken(null);
      form.reset({
        email: user?.primaryEmailAddress?.emailAddress ?? '',
        name: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      });
      createPaymentIntent.reset();
    }
  }, [form, open]);

  useEffect(() => {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email && !form.getValues('email')) {
      form.setValue('email', email);
    }
  }, [form, user?.primaryEmailAddress?.emailAddress]);

  const onInfoSubmit = async (values: InfoFormValues) => {
    if (hasPhysicalItems) {
      if (!values.name || !values.line1 || !values.city || !values.state || !values.postalCode || !values.country) {
        form.setError('root', { message: 'Please fill in all required shipping fields.' });
        return;
      }
    }

    try {
      const payload: StorePaymentIntentInput = {
        email: values.email,
        items: items.map(item => ({ priceId: item.product.priceId, quantity: item.quantity })),
      };

      if (hasPhysicalItems) {
        payload.shippingAddress = {
          name: values.name!,
          line1: values.line1!,
          line2: values.line2,
          city: values.city!,
          state: values.state!,
          postalCode: values.postalCode!,
          country: values.country!,
        };
      }

      const res = await createPaymentIntent.mutateAsync({ data: payload });
      setClientSecret(res.clientSecret);
      setOrderToken(res.order.confirmationToken);
      setStep('payment');
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { error?: string } };
      form.setError('root', {
        message: error.data?.error ?? error.message ?? 'Failed to initialize checkout. Please try again.',
      });
    }
  };

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing by clicking outside if processing payment
      if (!val && step === 'processing') return;
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border-border rounded-none shadow-2xl">
        <div className="p-6 border-b border-border bg-background">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase text-xl flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Secure Checkout
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {step === 'info' ? 'Step 1: Information' : step === 'payment' ? 'Step 2: Payment' : 'Processing Order'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {step === 'info' && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onInfoSubmit)} className="space-y-6">
                {form.formState.errors.root && (
                  <div className="p-3 text-sm font-mono text-destructive bg-destructive/10 border border-destructive/20">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-bold uppercase text-sm border-b border-border pb-2">Contact Information</h3>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase font-mono">Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" className="rounded-none bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {hasPhysicalItems && (
                  <div className="space-y-4 pt-4">
                    <h3 className="font-bold uppercase text-sm border-b border-border pb-2">Shipping Address</h3>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase font-mono">Full Name</FormLabel>
                          <FormControl>
                            <Input className="rounded-none bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="line1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase font-mono">Address Line 1</FormLabel>
                          <FormControl>
                            <Input className="rounded-none bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase font-mono">Apt, Suite, etc. (Optional)</FormLabel>
                          <FormControl>
                            <Input className="rounded-none bg-background" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase font-mono">City</FormLabel>
                            <FormControl>
                              <Input className="rounded-none bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase font-mono">State / Province</FormLabel>
                            <FormControl>
                              <Input className="rounded-none bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase font-mono">ZIP / Postal Code</FormLabel>
                            <FormControl>
                              <Input className="rounded-none bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase font-mono">Country</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="rounded-none bg-background">
                                  <SelectValue placeholder="Select Country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="US">United States</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-border mt-6">
                  <div className="flex justify-between text-sm mb-1 text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {hasPhysicalItems && (
                    <div className="flex justify-between text-sm mb-1 text-muted-foreground">
                      <span>Shipping</span>
                      <span>{shippingTotal === 0 ? 'FREE' : formatPrice(shippingTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg mb-4">
                    <span className="uppercase">Total</span>
                    <span className="text-primary font-mono">{formatPrice(total)}</span>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={createPaymentIntent.isPending}
                    className="w-full rounded-none h-12 uppercase font-mono font-bold tracking-widest bg-primary hover:bg-primary/90 glow-coral"
                  >
                    {createPaymentIntent.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue to Payment"}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {step === 'payment' && clientSecret && (
            <div className="space-y-6">
              <div className="flex justify-between font-bold text-lg border-b border-border pb-4 mb-4">
                <span className="uppercase">Total Due</span>
                <span className="text-primary font-mono">{formatPrice(total)}</span>
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <PaymentForm onSuccess={() => setStep('processing')} />
              </Elements>
            </div>
          )}

          {step === 'processing' && orderToken && (
            <OrderConfirmationPoller token={orderToken} onClose={handleClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
