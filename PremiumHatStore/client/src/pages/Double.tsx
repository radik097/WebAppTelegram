import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Dices } from "lucide-react";

export default function Double() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <Header balance={0} onlineCount={1} />
      
      <main className="flex-1 overflow-y-auto pb-20 flex items-center justify-center px-4">
        <Card className="p-12 text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Dices className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Double</h2>
          <p className="text-muted-foreground">
            Coming soon! Double your coins in this exciting game mode.
          </p>
        </Card>
      </main>
    </div>
  );
}
