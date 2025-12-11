import { useState } from "react";
import { Header } from "@/components/Header";
import { BattleCard } from "@/components/BattleCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Swords, Trophy, User } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useBattles, useCreateBattle, useJoinBattle } from "@/hooks/useBattles";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Battles() {
  const [activeTab, setActiveTab] = useState("active");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [stake, setStake] = useState("25");
  
  const { data: user } = useUser();
  const { data: activeBattles, isLoading: activeBattlesLoading } = useBattles("active", false);
  const { data: myBattles, isLoading: myBattlesLoading } = useBattles(undefined, true);
  const createBattle = useCreateBattle();
  const joinBattle = useJoinBattle();
  const { toast } = useToast();

  const handleCreateBattle = async () => {
    try {
      await createBattle.mutateAsync({ stake });
      setCreateDialogOpen(false);
      setStake("25");
      toast({
        title: "Battle created!",
        description: "Waiting for an opponent to join",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create battle",
        variant: "destructive",
      });
    }
  };

  const handleJoinBattle = async (battleId: string) => {
    try {
      await joinBattle.mutateAsync(battleId);
      toast({
        title: "Joined battle!",
        description: "Battle in progress...",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join battle",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header balance={user?.balance ? parseFloat(user.balance) : 0} onlineCount={1} />
      
      <main className="flex-1 overflow-y-auto pb-20 px-4">
        <div className="py-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-11">
              <TabsTrigger value="active" data-testid="tab-active" className="gap-1.5">
                <Swords className="w-4 h-4" />
                Active
              </TabsTrigger>
              <TabsTrigger value="top" data-testid="tab-top" className="gap-1.5">
                <Trophy className="w-4 h-4" />
                Top
              </TabsTrigger>
              <TabsTrigger value="my" data-testid="tab-my" className="gap-1.5">
                <User className="w-4 h-4" />
                My Battles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4 space-y-3">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full h-12 text-base font-semibold"
                    data-testid="button-create-battle"
                  >
                    Create Battle
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Battle</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="stake">Stake Amount</Label>
                      <Input
                        id="stake"
                        type="number"
                        placeholder="Enter stake amount"
                        value={stake}
                        onChange={(e) => setStake(e.target.value)}
                        data-testid="input-stake"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your balance: {user?.balance || "0.00"}
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleCreateBattle}
                      disabled={createBattle.isPending || !stake || parseFloat(stake) <= 0}
                      data-testid="button-confirm-create"
                    >
                      {createBattle.isPending ? "Creating..." : "Create Battle"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="space-y-3">
                {activeBattlesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))
                ) : activeBattles && activeBattles.length > 0 ? (
                  activeBattles.map((battle) => (
                    <BattleCard
                      key={battle.id}
                      battle={battle}
                      onJoin={() => handleJoinBattle(battle.id)}
                    />
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground" data-testid="text-no-battles">
                      No active battles
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Be the first to create one!
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="top" className="mt-4 space-y-3">
              <Card className="p-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No top battles yet
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="my" className="mt-4 space-y-3">
              {myBattlesLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))
              ) : myBattles && myBattles.length > 0 ? (
                myBattles.map((battle) => (
                  <BattleCard key={battle.id} battle={battle} />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    You haven't joined any battles yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="tabular-nums font-semibold">{user?.battlesCount || 0}</span> battles
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
