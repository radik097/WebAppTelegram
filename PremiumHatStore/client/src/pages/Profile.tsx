import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords, Trophy, Gift, Users, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [copied, setCopied] = useState(false);
  const { data: user, isLoading } = useUser();
  const { toast } = useToast();

  const handleCopyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const handleInvite = () => {
    if (user?.referralCode) {
      const shareText = `Join me on Battles! Use my code: ${user.referralCode}`;
      if (navigator.share) {
        navigator.share({
          title: "Join Battles",
          text: shareText,
        });
      }
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <Header balance={0} onlineCount={1} showAddBalance={false} />
        <main className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header balance={parseFloat(user.balance)} onlineCount={1} showAddBalance={false} />
      
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-20 h-20 border-2 border-primary">
                <AvatarImage src={user.photoUrl || undefined} />
                <AvatarFallback className="text-2xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate" data-testid="text-username">
                  {user.firstName}
                </h2>
                <p className="text-sm text-muted-foreground truncate">
                  @{user.username}
                </p>
                <Badge variant="secondary" className="mt-2 h-7 px-2.5 gap-1.5">
                  <Gift className="w-3.5 h-3.5" />
                  <span className="font-semibold tabular-nums">
                    {parseFloat(user.balance).toFixed(2)}
                  </span>
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Swords className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Battles</span>
                </div>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-battles-count">
                  {user.battlesCount}
                </p>
              </Card>
              
              <Card className="p-4 bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-chart-4" />
                  <span className="text-xs text-muted-foreground">Wins</span>
                </div>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-wins-count">
                  {user.winsCount}
                </p>
              </Card>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold mb-1">Invite friends and earn 1GN</h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold">20%</span> commission from your referrals
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary/50 rounded-lg px-3 py-2.5 border border-border">
                  <p className="text-xs text-muted-foreground mb-0.5">Your referral link</p>
                  <p className="text-sm font-mono truncate" data-testid="text-referral-code">
                    {user.referralCode}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyReferral}
                  data-testid="button-copy-referral"
                  className="h-11 w-11 flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-status-online" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <Button 
                className="w-full h-11 text-base font-semibold"
                data-testid="button-invite-friends"
                onClick={handleInvite}
              >
                Invite friends
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Friends</p>
                <p className="text-lg font-bold tabular-nums" data-testid="text-friends-count">0</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Volume</p>
                <p className="text-lg font-bold tabular-nums" data-testid="text-volume">
                  0.00
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Earned</p>
                <p className="text-lg font-bold tabular-nums" data-testid="text-earned">
                  0.00
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
