import React, { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { GiftCard } from '@/components/GiftCard';

interface GiftItem {
  id: string;
  gift: {
    name: string;
    image: string;
    price: number;
  };
  quantity: number;
  ids: string[]; // Array of gift IDs for this type
}

const MyGifts = () => {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGifts, setSelectedGifts] = useState<string[]>([]); // IDs of gifts selected for withdrawal

  const fetchGifts = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/my-gifts/${user.id}`);
      const data = await res.json();
      setGifts(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchGifts();
  }, [user]);

  const handleSelect = (giftIds: string[]) => {
    // Toggle selection logic (simplified: select all of this type or none, or just add to list)
    // For this example, let's say we select ONE instance of the gift type to withdraw
    // Or we can select ALL. Let's implement "Select 1" logic for simplicity or "Add to cart"
    
    // Let's just toggle the first available ID from the group into the selection
    const idToToggle = giftIds[0]; // Take the first one
    
    if (selectedGifts.includes(idToToggle)) {
        setSelectedGifts(prev => prev.filter(id => id !== idToToggle));
    } else {
        setSelectedGifts(prev => [...prev, idToToggle]);
    }
  };

  const handleWithdraw = async () => {
    if (selectedGifts.length === 0) return;
    setLoading(true);

    try {
        // 1. Calculate shipping fee (e.g. 10 stars per gift)
        const shippingFee = selectedGifts.length * 10;

        // 2. Create Invoice
        const res = await fetch('/api/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user?.id,
                amount: shippingFee,
                type: 'withdrawal',
                itemData: selectedGifts // Send array of IDs
            })
        });

        const data = await res.json();
        if (data.invoiceUrl) {
             // Open Telegram Invoice
             if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.openInvoice(data.invoiceUrl, (status: string) => {
                    if (status === 'paid') {
                        toast({ title: "Withdrawal Successful!", description: "Your gifts are on the way." });
                        fetchGifts(); // Refresh inventory
                        setSelectedGifts([]);
                    } else {
                        toast({ title: "Cancelled", variant: "destructive" });
                    }
                });
             } else {
                 // Fallback for testing in browser
                 window.open(data.invoiceUrl, '_blank');
             }
        }

    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to create withdrawal", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-24 space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Gift className="w-8 h-8" />
            My Inventory
          </h1>
          <p className="text-muted-foreground">Manage and withdraw your prizes</p>
        </div>
      </header>

      {gifts.length === 0 ? (
        <Card className="bg-card/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Gift className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-xl font-semibold mb-2">No Gifts Yet</h3>
                <p className="text-muted-foreground">Spin the slot machine to win exclusive prizes!</p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gifts.map((item) => (
                <div key={item.id} className={`relative border rounded-xl p-2 ${selectedGifts.includes(item.ids[0]) ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <GiftCard 
                        gift={item.gift} 
                        quantity={item.quantity} 
                    />
                    <Button 
                        variant={selectedGifts.includes(item.ids[0]) ? "default" : "outline"}
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleSelect(item.ids)}
                    >
                        {selectedGifts.includes(item.ids[0]) ? "Selected" : "Select for Withdraw"}
                    </Button>
                </div>
            ))}
        </div>
      )}

      {selectedGifts.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-10">
            <div className="container mx-auto flex justify-between items-center">
                <div>
                    <p className="font-semibold">{selectedGifts.length} items selected</p>
                    <p className="text-sm text-muted-foreground">Shipping Fee: {selectedGifts.length * 10} Stars</p>
                </div>
                <Button onClick={handleWithdraw} disabled={loading}>
                    {loading ? "Processing..." : "Withdraw Now"}
                </Button>
            </div>
        </div>
      )}
    </div>
  );
};

export default MyGifts;
