import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BattleWithUsers, InsertBattle } from "@/lib/types";

export function useBattles(status?: string, my?: boolean) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (my) params.append("my", "true");

  const queryString = params.toString();
  const url = `/api/battles${queryString ? `?${queryString}` : ""}`;

  return useQuery<BattleWithUsers[]>({
    queryKey: ["/api/battles", { status, my }],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch battles");
      return response.json();
    },
    refetchInterval: 3000,
  });
}

export function useCreateBattle() {
  return useMutation({
    mutationFn: async (data: { stake: string }) => {
      return apiRequest("POST", "/api/battles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    },
  });
}

export function useJoinBattle() {
  return useMutation({
    mutationFn: async (battleId: string) => {
      return apiRequest("POST", `/api/battles/${battleId}/join`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/battles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    },
  });
}
