import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { useSpins, useSpinHistory } from "@/hooks/useSpins";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { createAndOpenInvoice } from "@/lib/telegram";

const SPIN_COSTS = [50, 100, 200];

const SLOT_SYMBOLS = ["🍭", "🍬", "🧁", "🍿", "🍦"];

export default function Slot() {
  const [selectedCost, setSelectedCost] = useState(50);
  const [isSpinning, setIsSpinning] = useState(false);
  const [symbols, setSymbols] = useState(["🍭", "🍬", "🎁"]);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: user } = useUser();
  const { data: recentSpins } = useSpins(false, 10);
  const { data: mySpins } = useSpins(true, 10);
  const { data: history } = useSpinHistory(user ? parseInt(user.id) : undefined);
  const [lastProcessedSpinId, setLastProcessedSpinId] = useState<number | null>(null);

  const { toast } = useToast();

  // Initialize lastProcessedSpinId
  useEffect(() => {
    if (history && history.length > 0 && lastProcessedSpinId === null) {
      setLastProcessedSpinId(history[0].id);
    }
  }, [history]);

  // Watch for new spins from polling
  useEffect(() => {
    if (!isSpinning || !history || history.length === 0) return;

    const latest = history[0];
    // If we have a new spin (id > last processed)
    if (lastProcessedSpinId !== null && latest.id > lastProcessedSpinId) {
      finishSpin(latest);
      setLastProcessedSpinId(latest.id);
    }
  }, [history, isSpinning, lastProcessedSpinId]);

  const finishSpin = (result: any) => {
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }

    const resultSymbols = result.symbols || ["❓", "❓", "❓"];
    setSymbols(resultSymbols);

    if (result.win_amount > 0) {
      // @ts-ignore
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast({
        title: "You won!",
        description: `Prize: ${result.win_amount} stars!`,
      });
    } else {
      toast({
        title: "No luck",
        description: "Try again!",
      });
    }

    setIsSpinning(false);
  };

  const handleSpin = async () => {
    if (!user) return;

    try {
      // Create and open invoice
      await createAndOpenInvoice(selectedCost, parseInt(user.id));

      setIsSpinning(true);
      toast({
        title: "Payment Started",
        description: "Please complete payment in Telegram to spin.",
      });

      // Start visual spinning
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);

      spinIntervalRef.current = setInterval(() => {
        setSymbols([
          SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
          SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
          SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        ]);
      }, 100);

    } catch (error: any) {
      setIsSpinning(false);
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
                        Win: {spin.cost} coins
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
                        {spin.isWin ? "🎉 Won" : "Lost"} - {spin.cost} coins
                      </span>
                      <Badge variant={spin.isWin ? "default" : "secondary"}>
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
