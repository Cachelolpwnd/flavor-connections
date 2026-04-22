import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, X, ChefHat, Beaker, Utensils, Star, AlertTriangle, Check, BookOpen } from "lucide-react";
import type { Ingredient, FlavorPairingResult } from "@shared/schema";
import { SectionCard } from "@/components/SectionCard";
import { EmptyState } from "@/components/EmptyState";

const MAX_SELECTION = 15;

function strengthLabel(s: number): string {
  if (s >= 0.9) return "Отлично";
  if (s >= 0.8) return "Хорошо";
  if (s >= 0.7) return "Неплохо";
  if (s >= 0.5) return "Слабо";
  return "Минимально";
}

function strengthColor(s: number): string {
  if (s >= 0.9) return "text-green-700 dark:text-green-400";
  if (s >= 0.8) return "text-emerald-600 dark:text-emerald-400";
  if (s >= 0.7) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function categoryLabel(cat: string | null | undefined): string {
  if (!cat) return "";
  const map: Record<string, string> = {
    "классика": "Классика",
    "авангард": "Авангард",
    "современный": "Современный",
  };
  return map[cat] || cat;
}

function categoryVariant(cat: string | null | undefined): "default" | "secondary" | "outline" {
  if (cat === "классика") return "default";
  if (cat === "авангард") return "outline";
  return "secondary";
}

export default function Home() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [selectedMap, setSelectedMap] = useState<Map<string, Ingredient>>(new Map());

  const selectedIds = useMemo(() => new Set(selectedMap.keys()), [selectedMap]);

  const { data: ingredients, isLoading: ingredientsLoading } = useQuery<Ingredient[]>({
    queryKey: ["/api/ingredients", search, familyFilter === "all" ? "" : familyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (familyFilter && familyFilter !== "all") params.set("familyRu", familyFilter);
      params.set("limit", "500");
      const res = await fetch(`/api/ingredients?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: families } = useQuery<string[]>({
    queryKey: ["/api/families"],
  });

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const { data: flavorResults, isLoading: flavorLoading } = useQuery<FlavorPairingResult[]>({
    queryKey: ["/api/flavor-check", ...selectedArray],
    queryFn: async () => {
      if (selectedArray.length < 2) return [];
      const res = await apiRequest("POST", "/api/flavor-check", { ingredientIds: selectedArray });
      return res.json();
    },
    enabled: selectedArray.length >= 2,
  });

  const selectedIngredients = useMemo(() => Array.from(selectedMap.values()), [selectedMap]);

  const overallScore = useMemo(() => {
    if (!flavorResults || flavorResults.length === 0) return null;
    const avg = flavorResults.reduce((sum, r) => sum + r.strength, 0) / flavorResults.length;
    return avg;
  }, [flavorResults]);

  const toggleIngredient = useCallback((ing: Ingredient) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(ing.id)) {
        next.delete(ing.id);
      } else if (next.size < MAX_SELECTION) {
        next.set(ing.id, ing);
      } else {
        toast({
          title: "Лимит выбора",
          description: `Максимум ${MAX_SELECTION} ингредиентов`,
          variant: "destructive",
        });
        return prev;
      }
      return next;
    });
  }, [toast]);

  const clearSelection = useCallback(() => {
    setSelectedMap(new Map());
  }, []);

  const strongPairs = useMemo(() => {
    if (!flavorResults) return [];
    return [...flavorResults].sort((a, b) => b.strength - a.strength);
  }, [flavorResults]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs">
            <ChefHat className="w-3.5 h-3.5" />
            <span className="opacity-70">Ингредиентов</span>
            <span className="font-medium">{ingredients?.length ?? "..."}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs">
            <Utensils className="w-3.5 h-3.5" />
            <span className="opacity-70">Выбрано</span>
            <span className="font-medium">{selectedIds.size}/{MAX_SELECTION}</span>
          </div>
          {overallScore !== null && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs">
              <Star className="w-3.5 h-3.5" />
              <span className="opacity-70">Средняя совм.</span>
              <span className="font-medium">{Math.round(overallScore * 100)}%</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <SectionCard
              title="Ингредиенты"
              actions={
                selectedIds.size > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {selectedIds.size} выбрано
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={clearSelection} data-testid="button-clear-all">
                      <X className="w-3 h-3 mr-1" />
                      Сбросить
                    </Button>
                  </div>
                ) : undefined
              }
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-search"
                    placeholder="Поиск ингредиентов..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={familyFilter} onValueChange={setFamilyFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-family">
                    <SelectValue placeholder="Все категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {families?.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {ingredientsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-md" />
                  ))}
                </div>
              ) : !ingredients?.length ? (
                <EmptyState
                  icon={ChefHat}
                  title="Ингредиенты не найдены"
                  description="Попробуйте изменить поиск или фильтр"
                />
              ) : (
                <ScrollArea className="h-[420px]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 pr-4">
                    {ingredients.map((ing) => {
                      const isActive = selectedIds.has(ing.id);
                      return (
                        <button
                          key={ing.id}
                          data-testid={`button-ingredient-${ing.id}`}
                          onClick={() => toggleIngredient(ing)}
                          className={`text-left px-3 py-2 rounded-md text-sm transition-colors border w-full ${
                            isActive
                              ? "bg-primary/10 border-primary/30 text-foreground font-medium"
                              : "border-transparent hover-elevate"
                          }`}
                        >
                          <span className="block truncate">{ing.nameRu}</span>
                          {ing.familyRu && (
                            <span className="block text-xs text-muted-foreground truncate mt-0.5">
                              {ing.familyRu}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </SectionCard>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <SectionCard
              title="Выбранные ингредиенты"
            >
              {selectedIngredients.length === 0 ? (
                <EmptyState
                  icon={Utensils}
                  title="Нажмите на ингредиенты"
                  description="Выберите от 2 до 15 ингредиентов для проверки совместимости"
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedIngredients.map((ing) => (
                    <Badge
                      key={ing.id}
                      variant="secondary"
                      className="text-xs gap-1"
                      data-testid={`badge-selected-${ing.id}`}
                    >
                      {ing.nameRu}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleIngredient(ing);
                        }}
                        className="ml-0.5 rounded-full"
                        data-testid={`button-remove-${ing.id}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Вкусовая совместимость"
              actions={
                flavorResults && flavorResults.length > 0 ? (
                  <Badge variant="secondary" className="text-xs">
                    {flavorResults.length} пар
                  </Badge>
                ) : undefined
              }
            >
              {selectedIds.size < 2 ? (
                <EmptyState
                  icon={Star}
                  title="Выберите минимум 2 ингредиента"
                  description="Совместимость рассчитывается по вкусовым парам"
                />
              ) : flavorLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-md" />
                  ))}
                </div>
              ) : strongPairs.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Нет известных пар"
                  description="Для этих ингредиентов не найдено вкусовых сочетаний в базе данных"
                />
              ) : (
                <ScrollArea className="h-[440px]">
                  <div className="space-y-2 pr-4">
                    {strongPairs.map((pair) => (
                      <PairResult key={`${pair.ingredientAId}-${pair.ingredientBId}`} pair={pair} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </>
  );
}

function parseNoteAndSource(note: string | null | undefined): { description: string; source: string | null } {
  if (!note) return { description: "", source: null };
  const sourceMatch = note.match(/\(([^)]*(?:Flavor Bible|Flavor Thesaurus|Larousse Gastronomique)[^)]*)\)\s*$/);
  if (sourceMatch) {
    const description = note.slice(0, note.lastIndexOf(`(${sourceMatch[1]})`)).trim();
    return { description, source: sourceMatch[1] };
  }
  return { description: note, source: null };
}

function PairResult({ pair }: { pair: FlavorPairingResult }) {
  const pct = Math.round(pair.strength * 100);
  const { description, source } = parseNoteAndSource(pair.note);
  return (
    <div
      className="p-3 rounded-md border space-y-2"
      data-testid={`pair-result-${pair.ingredientAId}-${pair.ingredientBId}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium">{pair.ingredientAName}</span>
            <span className="text-xs text-muted-foreground">+</span>
            <span className="text-sm font-medium">{pair.ingredientBName}</span>
          </div>
        </div>
        <div className={`text-sm font-semibold tabular-nums ${strengthColor(pair.strength)}`}>
          {pct}%
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pair.strength >= 0.9 ? "bg-green-500" :
              pair.strength >= 0.8 ? "bg-emerald-500" :
              pair.strength >= 0.7 ? "bg-amber-500" :
              "bg-muted-foreground"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs ${strengthColor(pair.strength)}`}>
          {strengthLabel(pair.strength)}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {pair.isStable !== null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {pair.isStable ? (
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                )}
                {pair.isStable ? "Устойчивая" : "Экспериментальная"}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">
                {pair.isStable
                  ? "Проверенная классическая комбинация"
                  : "Авторская или экспериментальная комбинация"}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {pair.category && (
          <Badge variant={categoryVariant(pair.category)} className="text-[10px]">
            {categoryLabel(pair.category)}
          </Badge>
        )}

        {pair.sharedCompoundCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Beaker className="w-3 h-3" />
                {pair.sharedCompoundCount} молекул
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="text-xs font-medium mb-1">Общие аромамолекулы:</p>
                {pair.sharedCompounds.map((c) => (
                  <p key={c.id} className="text-xs text-muted-foreground">
                    {c.nameRu} {c.nameEn ? `(${c.nameEn})` : ""}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-pair-description">{description}</p>
      )}

      {source && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70" data-testid="text-pair-source">
          <BookOpen className="w-3 h-3 shrink-0" />
          <span className="italic">{source}</span>
        </div>
      )}
    </div>
  );
}
