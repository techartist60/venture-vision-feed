import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Phone, DollarSign, Star, Clock } from 'lucide-react';

interface BoostDialogProps {
  mediaId: string;
  isOwner: boolean;
  children: React.ReactNode;
}

export function BoostDialog({ mediaId, isOwner, children }: BoostDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleBoostIdea = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate Kenyan phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!/^(254|0)[17]\d{8}$/.test(cleanPhone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid Kenyan phone number (07xxxxxxxx or 254xxxxxxxx)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber: phoneNumber,
          mediaId: mediaId,
          amount: 10000 // 100 KES in cents
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Payment request sent!",
          description: "Check your phone for M-Pesa prompt. Payment will be processed automatically.",
        });
        setOpen(false);
        setPhoneNumber('');
      } else {
        throw new Error(data.error || 'Payment request failed');
      }
    } catch (error) {
      console.error('Boost payment error:', error);
      toast({
        title: "Payment failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Boost Your Idea
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Star className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Professional Innovation Review
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
                <li className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cost: KES 100
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration: 30 days boost
                </li>
                <li>• Expert review from professional innovation reviewer</li>
                <li>• Priority placement in discovery feed</li>
                <li>• Enhanced visibility to potential investors</li>
                <li>• Professional feedback and improvement suggestions</li>
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">M-Pesa Phone Number</Label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678 or 254712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                You'll receive an M-Pesa prompt on this number
              </p>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Payment Details:</p>
              <p>• Amount: KES 100</p>
              <p>• Payment method: M-Pesa STK Push</p>
              <p>• Secure payment processed by Safaricom</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBoostIdea}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Boost for KES 100
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}