import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Source } from "@shared/schema";

export function useSourcesList() {
  return useQuery<Source[]>({ queryKey: ["/api/sources"] });
}

export function useCreateSource() {
  return useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/sources", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
    },
  });
}
