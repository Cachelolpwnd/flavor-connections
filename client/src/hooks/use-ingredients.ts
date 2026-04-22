import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Ingredient, IngredientDetail, Source } from "@shared/schema";

export function useIngredients(q?: string) {
  return useQuery<Ingredient[]>({
    queryKey: ["/api/ingredients", q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "500");
      const res = await fetch(`/api/ingredients?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
}

export function useIngredientDetail(id?: string) {
  return useQuery<IngredientDetail>({
    queryKey: ["/api/ingredients", id],
    enabled: !!id,
  });
}

export function useSources() {
  return useQuery<Source[]>({ queryKey: ["/api/sources"] });
}

export function useFamilies() {
  return useQuery<string[]>({ queryKey: ["/api/families"] });
}

export function useCreateIngredient() {
  return useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/ingredients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
    },
  });
}

export function useUpdateIngredient(id: string) {
  return useMutation({
    mutationFn: async (data: any) => apiRequest("PUT", `/api/ingredients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
    },
  });
}

export function useDeleteIngredient() {
  return useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/ingredients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients"] });
    },
  });
}
