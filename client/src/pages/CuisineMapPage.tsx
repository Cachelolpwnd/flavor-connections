import { useState } from "react";
import { CuisineGraphCanvas } from "@/components/CuisineGraphCanvas";
import { IngredientDetailPanel } from "@/components/IngredientDetailPanel";
import { useCuisineTags, useCuisineGraph } from "@/hooks/use-cuisine-graph";
import { SectionCard } from "@/components/SectionCard";
import { StatPill } from "@/components/StatPill";
import { Badge } from "@/components/ui/badge";
import { Loader2, Network, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CuisineMapPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCuisineIds, setSelectedCuisineIds] = useState<string[]>([]);

  const { data: cuisineTags, isLoading: tagsLoading } = useCuisineTags();
  const { data: graphData, isLoading: graphLoading } = useCuisineGraph(selectedCuisineIds);

  const toggleCuisine = (id: string) => {
    setSelectedCuisineIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setActiveId(null);
  };

  const clearSelection = () => {
    setSelectedCuisineIds([]);
    setActiveId(null);
  };

  const selectedNames = cuisineTags
    ?.filter((t) => selectedCuisineIds.includes(t.id))
    .map((t) => t.nameRu) ?? [];

  return (
    <div className="flex flex-col h-full gap-4 anim-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-serif font-semibold tracking-tight" data-testid="text-cuisine-page-title">
          Кухни мира
        </h1>
        {graphData && (
          <div className="flex gap-2 ml-auto">
            <StatPill icon={Network} label="Ингредиенты" value={graphData.nodes.length} />
            <StatPill icon={Link2} label="Связи" value={graphData.links.length} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2" data-testid="cuisine-tag-filters">
        {tagsLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            {cuisineTags?.map((tag) => {
              const isSelected = selectedCuisineIds.includes(tag.id);
              return (
                <Badge
                  key={tag.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer select-none toggle-elevate ${isSelected ? "toggle-elevated" : ""}`}
                  onClick={() => toggleCuisine(tag.id)}
                  data-testid={`badge-cuisine-${tag.nameEn?.toLowerCase() ?? tag.id}`}
                >
                  {tag.nameRu}
                  <span className="ml-1 opacity-60 text-[10px]">{tag.ingredientCount}</span>
                </Badge>
              );
            })}
            {selectedCuisineIds.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                data-testid="button-clear-cuisines"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Сбросить
              </Button>
            )}
          </>
        )}
      </div>

      {selectedNames.length > 0 && (
        <p className="text-sm text-muted-foreground -mt-1" data-testid="text-cuisine-description">
          Показаны популярные ингредиенты и их сочетания: {selectedNames.join(", ")}
        </p>
      )}

      <SectionCard className="flex-1 min-h-[500px] relative">
        {graphLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : graphData && graphData.nodes.length > 0 ? (
          <>
            <CuisineGraphCanvas
              nodes={graphData.nodes}
              links={graphData.links}
              activeId={activeId}
              onNodeClick={setActiveId}
            />
            {activeId && (
              <IngredientDetailPanel
                ingredientId={activeId}
                onClose={() => setActiveId(null)}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm" data-testid="text-cuisine-empty">
            {selectedCuisineIds.length > 0
              ? "Нет сочетаний для выбранных кухонь. Попробуйте другую комбинацию."
              : "Выберите кухню, чтобы увидеть популярные ингредиенты и их связи"}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
