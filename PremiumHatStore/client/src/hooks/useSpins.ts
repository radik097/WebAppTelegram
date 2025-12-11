import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Spin, SpinResult } from "@shared/schema";

import { getInitData } from "@/lib/telegram";

export function useSpins(my?: boolean, limit?: number) {
  const params = new URLSearchParams();
  if (my) params.append("my", "true");
  if (limit) params.append("limit", limit.toString());

  const queryString = params.toString();
  const url = `/api/spins${queryString ? `?${queryString}` : ""}`;

  return useQuery<Spin[]>({
    queryKey: ["/api/spins", { my, limit }],
    queryFn: async () => {
      const initData = getInitData();
      const response = await fetch(url, {
        headers: {
          "Authorization": `tma ${initData}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch spins");
      return response.json();
    },
  });
}



export function useSpinHistory(userId?: number) {
  const BACKEND_URL = (import.meta as any)?.env?.VITE_BACKEND_URL || "";

  return useQuery({
    queryKey: ["/api/user-spins", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`${BACKEND_URL}/api/user-spins/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      return data.spins || [];
    },
    enabled: !!userId,
    refetchInterval: 2000,
  });
}
