import { Coins, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  balance?: number;
  onlineCount?: number;
  showAddBalance?: boolean;
}

export function Header({ balance = 0, onlineCount = 1, showAddBalance = true }: HeaderProps) {
  return (
    <header className="sticky top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-40 px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-status-online" />
          <span className="text-sm text-muted-foreground" data-testid="text-online-count">
            {onlineCount} online
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className="h-9 px-3 gap-1.5 text-base font-bold tabular-nums"
            data-testid="badge-balance"
          >
            <Coins className="w-4 h-4 text-primary" />
            {balance.toFixed(2)}
          </Badge>
          {showAddBalance && (
            <Button 
              size="icon" 
              variant="ghost"
              data-testid="button-add-balance"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
