import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SensoryTag } from "@shared/schema";

export function useTags(q?: string) {
  return useQuery<SensoryTag[]>({
    queryKey: ["/api/tags", q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "500");
      const res = await fetch(`/api/tags?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

export function useCreateTag() {
  return useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/tags", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
  });
}
