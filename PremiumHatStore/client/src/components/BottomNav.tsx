import { useLocation, Link } from "wouter";
import { Swords, Trophy, Dices, Candy, Gift, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Swords, label: "Battles" },
  { path: "/jackpot", icon: Trophy, label: "Jackpot" },
  { path: "/double", icon: Dices, label: "Double" },
  { path: "/slot", icon: Candy, label: "Slot" },
  { path: "/gifts", icon: Gift, label: "My Gifts" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border h-16 z-50 safe-area-pb">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[48px] h-12 rounded-md transition-colors hover-elevate active-elevate-2",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
