import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { useSpins } from "@/hooks/useSpins";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { createInvoice, openInvoice } from "@/lib/telegram";

const SPIN_COSTS = [50, 100, 200];
const SLOT_SYMBOLS = ["🍭", "🍬", "🧁", "🍿", "🍦"];
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function Slot() {
  const [selectedCost, setSelectedCost] = useState(50);
  const [isSpinning, setIsSpinning] = useState(false);
  const [symbols, setSymbols] = useState(["🍭", "🍬", "🎁"]);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: user } = useUser();
  const { data: recentSpins } = useSpins(false, 10);
  const { data: mySpins } = useSpins(true, 10);
  
  const { toast } = useToast();

  const finishSpinAnimation = (result: any) => {
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }

    const resultSymbols = result.symbols || ["❓", "❓", "❓"];
    setSymbols(resultSymbols);
    setIsSpinning(false);

    if (result.isWin) {
      // @ts-ignore
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });

      if (result.wonGift) {
        toast({
          title: "🎉 JACKPOT! 🎉",
          description: `You won: ${result.wonGift.name}! Check your Inventory.`,
          duration: 5000,
          className: "bg-green-600 text-white"
        });
      } else {
         // Случай, когда выиграл, но подарка не нашлось (fallback)
         toast({
          title: "You Won!",
          description: `Prize: ${result.winAmount} stars!`,
        });
      }
    } else {
      toast({
        title: "No luck this time",
        description: "Try again!",
      });
    }
  };

  const startPolling = (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/spin-status/${sessionId}`);
        const data = await res.json();

        if (data.status === 'COMPLETED' && data.result) {
          clearInterval(pollInterval);
          finishSpinAnimation(data.result);
        } else if (data.status === 'FAILED') {
           clearInterval(pollInterval);
           setIsSpinning(false);
           toast({ title: "Server Error", variant: "destructive" });
        }
        // If status is PAID or CREATED - continue waiting
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);

    // Timeout after 30 seconds
    setTimeout(() => {
        clearInterval(pollInterval);
        if (isSpinning) {
            setIsSpinning(false);
            toast({ title: "Timeout", description: "Check your history later" });
        }
    }, 30000);
  };

  const handleSpin = async () => {
    if (!user) return;
    setIsSpinning(true);

    // Start visual spinning
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    spinIntervalRef.current = setInterval(() => {
      setSymbols([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      ]);
    }, 100);

    try {
      // 1. Create session on server
      const { invoiceUrl, sessionId } = await createInvoice(parseInt(user.id), selectedCost, 'spin');

      // 2. Open invoice
      // @ts-ignore
      window.Telegram.WebApp.openInvoice(invoiceUrl, (status: string) => {
        if (status === 'paid') {
            toast({ title: "Payment sent!", description: "Waiting for server result..." });
            startPolling(sessionId);
        } else if (status === 'cancelled') {
            setIsSpinning(false);
            if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
            toast({ title: "Cancelled", variant: "destructive" });
        } else {
            setIsSpinning(false);
            if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
            toast({ title: "Payment failed", variant: "destructive" });
        }
      });

    } catch (error: any) {
      setIsSpinning(false);
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header balance={user?.balance ? parseFloat(user.balance) : 0} onlineCount={1} />

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 space-y-4">
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="text-center mb-6">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold">Slot Machine</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Spin to win amazing gifts!
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {symbols.map((symbol, i) => (
                <Card
                  key={i}
                  className="aspect-square flex items-center justify-center bg-secondary/50"
                >
                  <div
                    className={cn(
                      "text-5xl transition-transform",
                      isSpinning && "blur-sm"
                    )}
                  >
                    {symbol}
                  </div>
                </Card>
              ))}
            </div>

            <div className="mb-4">
              <p className="text-xs text-muted-foreground text-center mb-2">
                Select spin cost
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {SPIN_COSTS.map((cost) => (
                  <Badge
                    key={cost}
                    variant={selectedCost === cost ? "default" : "outline"}
                    className={cn(
                      "h-8 px-3 cursor-pointer hover-elevate active-elevate-2",
                      selectedCost === cost && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => setSelectedCost(cost)}
                    data-testid={`badge-spin-cost-${cost}`}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {cost}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              className="w-full h-12 text-base font-bold"
              onClick={handleSpin}
              disabled={isSpinning}
              data-testid="button-spin"
            >
              {isSpinning ? "Spinning..." : `Spin for ${selectedCost}`}
            </Button>
          </Card>

          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="live" data-testid="tab-live" className="gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Live
              </TabsTrigger>
              <TabsTrigger value="my-spins" data-testid="tab-my-spins" className="gap-1.5">
                <Clock className="w-4 h-4" />
                My Spins
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-4 space-y-3">
              {recentSpins && recentSpins.length > 0 ? (
                <div className="space-y-2">
                  {recentSpins.map((spin) => (
                    <Card key={spin.id} className="p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Win: {spin.result?.win_amount || 0} coins
                      </span>
                      <Badge variant="secondary">
                        {new Date(spin.createdAt).toLocaleTimeString()}
                      </Badge>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    No recent wins
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="my-spins" className="mt-4 space-y-3">
              {mySpins && mySpins.length > 0 ? (
                <div className="space-y-2">
                  {mySpins.map((spin) => (
                    <Card key={spin.id} className="p-3 flex items-center justify-between">
                      <span className="text-sm">
                        {spin.result?.isWin ? "🎉 Won" : "Lost"} - {spin.result?.win_amount || 0} coins
                      </span>
                      <Badge variant={spin.result?.isWin ? "default" : "secondary"}>
                        {new Date(spin.createdAt).toLocaleTimeString()}
                      </Badge>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    You haven't spun yet
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
