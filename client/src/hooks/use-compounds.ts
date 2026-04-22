import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AromaCompound } from "@shared/schema";

export function useCompounds(q?: string) {
  return useQuery<AromaCompound[]>({
    queryKey: ["/api/compounds", q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "500");
      const res = await fetch(`/api/compounds?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

export function useCreateCompound() {
  return useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/compounds", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compounds"] });
    },
  });
}
