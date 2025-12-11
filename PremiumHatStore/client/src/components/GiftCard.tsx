import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Gift } from "@/lib/types";

interface GiftCardProps {
  gift: Gift;
  quantity?: number;
  onClick?: () => void;
  className?: string;
}

const rarityColors = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-chart-2/20 text-chart-2",
  epic: "bg-chart-3/20 text-chart-3",
  legendary: "bg-chart-4/20 text-chart-4",
};

export function GiftCard({ gift, quantity, onClick, className }: GiftCardProps) {
  return (
    <Card
      className={cn(
        "relative p-3 hover-elevate active-elevate-2 cursor-pointer overflow-visible",
        className
      )}
      onClick={onClick}
      data-testid={`card-gift-${gift.id}`}
    >
      {quantity !== undefined && quantity > 1 && (
        <Badge
          variant="secondary"
          className="absolute -top-2 -right-2 h-6 min-w-6 px-1.5 rounded-full text-xs font-bold z-10"
          data-testid={`badge-quantity-${gift.id}`}
        >
          {quantity}
        </Badge>
      )}

      <div className="aspect-square rounded-lg bg-secondary/50 mb-2 flex items-center justify-center overflow-hidden">
        {gift.imageUrl ? (
          <img
            src={gift.imageUrl}
            alt={gift.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-4xl">{gift.name.charAt(0)}</div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-medium truncate" data-testid={`text-gift-name-${gift.id}`}>
            {gift.name}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs capitalize px-1.5 h-5",
              rarityColors[gift.rarity as keyof typeof rarityColors] || rarityColors.common
            )}
          >
            {gift.rarity}
          </Badge>
          <span className="text-xs font-semibold text-primary tabular-nums">
            {parseFloat(gift.value).toFixed(2)}
          </span>
        </div>
      </div>
    </Card>
  );
}
