import { useQuery } from "@tanstack/react-query";
import type { CuisineTag } from "@shared/schema";

export type CuisineTagWithCount = CuisineTag & { ingredientCount: number };

export function useCuisineTags() {
  return useQuery<CuisineTagWithCount[]>({
    queryKey: ["/api/cuisine-tags"],
  });
}

export interface CuisineGraphData {
  nodes: Array<{ id: string; nameRu: string; familyRu: string | null }>;
  links: Array<{
    source: string;
    target: string;
    strength: number;
    category: string | null;
    note: string | null;
  }>;
}

export function useCuisineGraph(cuisineTagIds: string[]) {
  const param = cuisineTagIds.length > 0 ? cuisineTagIds.join(",") : undefined;
  return useQuery<CuisineGraphData>({
    queryKey: ["/api/cuisine-graph", param],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (param) params.set("cuisineTagIds", param);
      const res = await fetch(`/api/cuisine-graph?${params}`);
      if (!res.ok) throw new Error("Failed to load cuisine graph");
      return res.json();
    },
    enabled: cuisineTagIds.length > 0,
  });
}
