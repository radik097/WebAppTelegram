import { useQuery } from "@tanstack/react-query";
import type { UserGiftWithGift } from "@/lib/types";

export function useUserGifts() {
  return useQuery<UserGiftWithGift[]>({
    queryKey: ["/api/user-gifts"],
  });
}
