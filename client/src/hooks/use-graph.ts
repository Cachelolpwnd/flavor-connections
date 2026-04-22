import { useQuery } from "@tanstack/react-query";

export interface PairingGraphData {
  nodes: Array<{ id: string; nameRu: string; familyRu: string | null }>;
  links: Array<{ source: string; target: string; strength: number; category: string | null; note: string | null }>;
}

export function useGraph() {
  return useQuery<PairingGraphData>({
    queryKey: ["/api/graph"],
    queryFn: async () => {
      const res = await fetch("/api/graph");
      if (!res.ok) throw new Error("Failed to load graph");
      return res.json();
    },
  });
}
