import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Swords, Trophy, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BattleWithUsers } from "@/lib/types";

interface BattleCardProps {
  battle: BattleWithUsers;
  onJoin?: () => void;
  onView?: () => void;
  className?: string;
}

export function BattleCard({ battle, onJoin, onView, className }: BattleCardProps) {
  const isActive = battle.status === "active";
  const isCompleted = battle.status === "completed";

  return (
    <Card
      className={cn(
        "p-4 hover-elevate active-elevate-2",
        className
      )}
      data-testid={`card-battle-${battle.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="w-12 h-12 border-2 border-border">
            <AvatarImage src={battle.creator.photoUrl || undefined} />
            <AvatarFallback>{battle.creator.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold truncate" data-testid={`text-creator-${battle.id}`}>
                {battle.creator.username}
              </p>
              {isCompleted && battle.winnerId === battle.creatorId && (
                <Trophy className="w-4 h-4 text-chart-4 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="h-6 px-2 gap-1 text-xs font-bold tabular-nums"
              >
                <Coins className="w-3 h-3 text-primary" />
                {parseFloat(battle.stake).toFixed(0)}
              </Badge>

              {battle.opponent && (
                <div className="flex items-center gap-1">
                  <Swords className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {battle.opponent.username}
                  </span>
                  {isCompleted && battle.winnerId === battle.opponentId && (
                    <Trophy className="w-3 h-3 text-chart-4" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          {isActive && !battle.opponent && onJoin && (
            <Button
              size="sm"
              data-testid={`button-join-${battle.id}`}
              onClick={onJoin}
            >
              Join
            </Button>
          )}
          {(isCompleted || battle.opponent) && onView && (
            <Button
              size="sm"
              variant="outline"
              data-testid={`button-view-${battle.id}`}
              onClick={onView}
            >
              View
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
