import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import Battles from "@/pages/Battles";
import Slot from "@/pages/Slot";
import Jackpot from "@/pages/Jackpot";
import Double from "@/pages/Double";
import MyGifts from "@/pages/MyGifts";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import { TelegramAuthGuard } from "@/components/TelegramAuthGuard";

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Battles} />
        <Route path="/slot" component={Slot} />
        <Route path="/jackpot" component={Jackpot} />
        <Route path="/double" component={Double} />
        <Route path="/gifts" component={MyGifts} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </>
  );
}

function App() {
  // Initialize Telegram WebApp (if available) and expose a helper for quick testing
  React.useEffect(() => {
    // lazy import to avoid SSR issues
    import("./lib/telegram.ts").then((mod) => {
      try {
        const tg = mod.initTelegram();
        // expose helper on window for debugging
        // UPDATED: Use available functions from the new telegram.ts API
        (window as any).__TG_HELPER__ = {
          createInvoice: (mod as any).createInvoice,
          // openInvoice might not be exported directly if logic moved, 
          // but we map what we can found or just tgInstance
          tgInstance: tg,
        };
        // small console hint
        console.info("Telegram helper ready on window.__TG_HELPER__");
      } catch (e) {
        console.warn("Telegram helper initialization failed", e);
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <TelegramAuthGuard>
          <Router />
        </TelegramAuthGuard>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
