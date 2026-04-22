import { useState, useCallback, useMemo } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import { IngredientDetailPanel, type CreatedLink } from "@/components/IngredientDetailPanel";
import { useGraph } from "@/hooks/use-graph";
import { SectionCard } from "@/components/SectionCard";
import { StatPill } from "@/components/StatPill";
import { Loader2, Network, Link2 } from "lucide-react";

export default function MapPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localLinks, setLocalLinks] = useState<CreatedLink[]>([]);
  const [basket, setBasket] = useState<Array<{ id: string; name: string }>>([]);
  const { data, isLoading } = useGraph();

  const handleLinkCreated = useCallback((link: CreatedLink) => {
    setLocalLinks((prev) => {
      const exists = prev.some(
        (l) =>
          (l.source === link.source && l.target === link.target) ||
          (l.source === link.target && l.target === link.source)
      );
      if (exists) return prev;
      return [...prev, link];
    });
  }, []);

  const handleNodeClick = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  const handleAddToBasket = useCallback((id: string, name: string) => {
    setBasket((prev) => {
      const already = prev.find((b) => b.id === id);
      if (already) return prev.filter((b) => b.id !== id);
      return [...prev, { id, name }];
    });
  }, []);

  const handleRemoveFromBasket = useCallback((id: string) => {
    setBasket((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const basketIds = useMemo(() => basket.map((b) => b.id), [basket]);

  const mergedLinks = useMemo(() => {
    if (!data) return [];
    return [...data.links, ...localLinks];
  }, [data, localLinks]);

  return (
    <div className="flex flex-col h-full p-4 gap-4 anim-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-serif font-semibold tracking-tight" data-testid="text-page-title">
          Карта связей
        </h1>
        {data && (
          <div className="flex gap-2 ml-auto">
            <StatPill icon={Network} label="Вершины" value={data.nodes.length} />
            <StatPill icon={Link2} label="Связи" value={mergedLinks.length} />
          </div>
        )}
      </div>

      <SectionCard className="flex-1 min-h-[500px] relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <GraphCanvas
              nodes={data.nodes}
              links={mergedLinks}
              activeId={activeId}
              onNodeClick={handleNodeClick}
              onAddToBasket={handleAddToBasket}
              basketIds={basketIds}
            />
            {activeId && (
              <IngredientDetailPanel
                ingredientId={activeId}
                onClose={() => setActiveId(null)}
                onLinkCreated={handleLinkCreated}
                basket={basket}
                onRemoveFromBasket={handleRemoveFromBasket}
              />
            )}
          </>
        ) : null}
      </SectionCard>
    </div>
  );
}
