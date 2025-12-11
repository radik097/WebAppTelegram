import { Header } from "@/components/Header";
import { GiftCard } from "@/components/GiftCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ShoppingBag } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useUserGifts } from "@/hooks/useUserGifts";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyGifts() {
  const { data: user } = useUser();
  const { data: userGifts, isLoading } = useUserGifts();

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header balance={user?.balance ? parseFloat(user.balance) : 0} onlineCount={1} showAddBalance={false} />
      
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Send your gifts to <span className="text-primary font-medium">@GiftsGoBattles</span> to refill the inventory
            </p>
            <Button 
              size="sm"
              data-testid="button-send-gifts"
            >
              Send Gifts
            </Button>
          </div>

          <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="inventory" data-testid="tab-inventory" className="gap-1.5">
                <Package className="w-4 h-4" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="shop" data-testid="tab-shop" className="gap-1.5">
                <ShoppingBag className="w-4 h-4" />
                Shop
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-lg" />
                  ))}
                </div>
              ) : userGifts && userGifts.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {userGifts.map((userGift) => (
                    <GiftCard
                      key={userGift.id}
                      gift={userGift.gift}
                      quantity={userGift.quantity}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-2" data-testid="text-no-gifts">
                    No gifts in your inventory
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Spin the slot machine to win gifts!
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="shop" className="mt-4">
              <Card className="p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium mb-2">
                  Shop coming soon
                </p>
                <p className="text-sm text-muted-foreground">
                  Buy exclusive gifts and items
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
