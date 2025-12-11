import { useQuery } from "@tanstack/react-query";
import type { User } from "@/lib/types";

export function useUser() {
  return useQuery<User>({
    queryKey: ["/api/users/me"],
    refetchInterval: 5000,
  });
}
