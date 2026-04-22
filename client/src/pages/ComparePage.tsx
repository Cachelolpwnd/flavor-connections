import { useState, useCallback, useEffect } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Plus, FlaskConical, Database, HelpCircle, Sparkles, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { Ingredient } from "@shared/schema";

type PairResult = {
  ingredientAId: string;
  ingredientBId: string;
  strength: number;
  source: "database" | "compounds" | "recipes" | "none";
  sharedCompoundCount: number;
  note: string | null;
  category: string | null;
  recipeCooccurrenceCount: number;
  recipeStrengthBonus: number;
};

type MatrixResult = {
  ingredients: Array<{ id: string; nameRu: string; familyRu: string | null }>;
  pairs: PairResult[];
  overallScore: number;
};

function strengthLabel(s: number) {
  if (s >= 0.8) return "Сильное";
  if (s >= 0.5) return "Среднее";
  if (s > 0) return "Слабое";
  return "Нет данных";
}

function strengthColor(s: number) {
  if (s >= 0.8) return "bg-emerald-500";
  if (s >= 0.5) return "bg-amber-400";
  if (s > 0) return "bg-orange-300";
  return "bg-muted";
}

function strengthTextColor(s: number) {
  if (s >= 0.8) return "text-emerald-700 dark:text-emerald-400";
  if (s >= 0.5) return "text-amber-700 dark:text-amber-400";
  if (s > 0) return "text-orange-600 dark:text-orange-400";
  return "text-muted-foreground";
}

function SourceBadge({ source }: { source: PairResult["source"] }) {
  if (source === "database") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Database className="w-3 h-3" /> из базы
      </span>
    );
  }
  if (source === "compounds") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <FlaskConical className="w-3 h-3" /> по соединениям
      </span>
    );
  }
  if (source === "recipes") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <UtensilsCrossed className="w-3 h-3" /> по рецептам
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <HelpCircle className="w-3 h-3" /> нет данных
    </span>
  );
}

function StrengthBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all ${strengthColor(value)}`}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

function PairBridgeSuggestions({ ingredientAId, ingredientBId, nameA, nameB }: {
  ingredientAId: string;
  ingredientBId: string;
  nameA: string;
  nameB: string;
}) {
  const [open, setOpen] = useState(false);

  const { data: bridgesA } = useQuery<Array<{ toIngredientId: string; toIngredientName: string; sharedCompoundCount: number }>>({
    queryKey: ["/api/ingredients", ingredientAId, "bridges"],
    enabled: open,
  });

  const { data: bridgesB } = useQuery<Array<{ toIngredientId: string; toIngredientName: string; sharedCompoundCount: number }>>({
    queryKey: ["/api/ingredients", ingredientBId, "bridges"],
    enabled: open,
  });

  const suggestions = (() => {
    if (!bridgesA || !bridgesB) return [];
    const bSet = new Map(bridgesB.map(b => [b.toIngredientId, b.sharedCompoundCount]));
    return bridgesA
      .filter(a => a.toIngredientId !== ingredientBId && bSet.has(a.toIngredientId))
      .map(a => ({
        id: a.toIngredientId,
        name: a.toIngredientName,
        score: a.sharedCompoundCount + (bSet.get(a.toIngredientId) || 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  })();

  return (
    <div className="border-t pt-2 mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        data-testid={`button-suggestions-${ingredientAId}-${ingredientBId}`}
      >
        <Sparkles className="w-3 h-3" />
        {open ? "Скрыть подсказки" : "Что ещё сочетается с обоими?"}
      </button>
      {open && (
        <div className="mt-1.5">
          {(!bridgesA || !bridgesB) ? (
            <p className="text-xs text-muted-foreground">Загружаем...</p>
          ) : suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <Badge key={s.id} variant="secondary" className="text-xs" data-testid={`badge-suggestion-${s.id}`}>
                  {s.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Общих партнёров не найдено</p>
          )}
        </div>
      )}
    </div>
  );
}

function PairRecipes({ nameA, nameB }: { nameA: string; nameB: string }) {
  const [open, setOpen] = useState(false);

  const { data: recipes } = useQuery<Array<{ id: number; name: string; category: string }>>({
    queryKey: ["/api/recipes/pairs", nameA, nameB],
    queryFn: async () => {
      const params = new URLSearchParams({ a: nameA, b: nameB });
      const res = await fetch(`/api/recipes/pairs?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  return (
    <div className="border-t pt-2 mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        data-testid={`button-recipes-${nameA}-${nameB}`}
      >
        <UtensilsCrossed className="w-3 h-3" />
        {open ? "Скрыть рецепты" : "Рецепты с этой парой"}
      </button>
      {open && (
        <div className="mt-1.5 space-y-0.5">
          {!recipes ? (
            <p className="text-xs text-muted-foreground">Загружаем...</p>
          ) : recipes.length > 0 ? (
            recipes.map((r) => (
              <p key={r.id} className="text-xs text-muted-foreground">· {r.name}</p>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Рецептов не найдено</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const searchStr = useSearch();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Array<{ id: string; nameRu: string; familyRu: string | null }>>([]);
  const [initialIdsLoaded, setInitialIdsLoaded] = useState(false);

  const urlIds = (() => {
    const raw = searchStr || "";
    const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
    const ids = params.get("ids");
    return ids ? ids.split(",").filter(Boolean) : [];
  })();

  const { data: initialIngredients } = useQuery<Ingredient[]>({
    queryKey: ["/api/ingredients/initial", ...urlIds],
    queryFn: async () => {
      if (urlIds.length === 0) return [];
      const results = await Promise.all(
        urlIds.map(id =>
          fetch(`/api/ingredients/${id}`).then(r => r.ok ? r.json() : null)
        )
      );
      return results.filter(Boolean);
    },
    enabled: urlIds.length > 0 && !initialIdsLoaded,
  });

  useEffect(() => {
    if (initialIngredients && initialIngredients.length > 0 && !initialIdsLoaded) {
      setSelected(initialIngredients.map(ing => ({
        id: ing.id,
        nameRu: ing.nameRu,
        familyRu: ing.familyRu ?? null,
      })));
      setInitialIdsLoaded(true);
    }
  }, [initialIngredients, initialIdsLoaded]);

  const { data: searchResults } = useQuery<Ingredient[]>({
    queryKey: ["/api/ingredients", search],
    enabled: search.trim().length >= 1,
    queryFn: () =>
      apiRequest("GET", `/api/ingredients?q=${encodeURIComponent(search)}&limit=10`).then((r) => r.json()),
  });

  const selectedIds = selected.map((s) => s.id);

  const { data: matrix, isLoading: matrixLoading } = useQuery<MatrixResult>({
    queryKey: ["/api/pairings/matrix", ...selectedIds],
    enabled: selectedIds.length >= 2,
    queryFn: () =>
      apiRequest("GET", `/api/pairings/matrix?ids=${selectedIds.join(",")}`).then((r) => r.json()),
  });

  const addIngredient = useCallback(
    (ing: Ingredient) => {
      if (selected.find((s) => s.id === ing.id)) return;
      setSelected((prev) => [...prev, { id: ing.id, nameRu: ing.nameRu, familyRu: ing.familyRu ?? null }]);
      setSearch("");
    },
    [selected]
  );

  const removeIngredient = useCallback((id: string) => {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const filteredResults = searchResults?.filter((r) => !selectedIds.includes(r.id)) ?? [];

  const nameMap = new Map(selected.map((s) => [s.id, s.nameRu]));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-1" data-testid="text-compare-title">
          Подбор сочетаний
        </h1>
        <p className="text-sm text-muted-foreground">
          Добавьте 2 и более ингредиента, чтобы увидеть совместимость каждой пары и общую оценку набора.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Найти ингредиент..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-ingredient-search"
        />
        {filteredResults.length > 0 && search.trim().length > 0 && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border rounded-md shadow-md max-h-60 overflow-y-auto">
            {filteredResults.map((ing) => (
              <button
                key={ing.id}
                className="w-full text-left px-4 py-2.5 hover:bg-accent text-sm flex items-center justify-between gap-2"
                onClick={() => addIngredient(ing)}
                data-testid={`button-add-ingredient-${ing.id}`}
              >
                <span>{ing.nameRu}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {ing.familyRu && <Badge variant="outline" className="text-xs py-0">{ing.familyRu}</Badge>}
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="list-selected-ingredients">
          {selected.map((ing) => (
            <div
              key={ing.id}
              className="flex items-center gap-1.5 bg-accent rounded-full px-3 py-1.5 text-sm"
              data-testid={`chip-ingredient-${ing.id}`}
            >
              <span>{ing.nameRu}</span>
              {ing.familyRu && (
                <span className="text-xs text-muted-foreground">· {ing.familyRu}</span>
              )}
              <button
                onClick={() => removeIngredient(ing.id)}
                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`button-remove-ingredient-${ing.id}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selected.length < 2 && (
        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
          Добавьте минимум 2 ингредиента для анализа совместимости
        </div>
      )}

      {matrixLoading && selected.length >= 2 && (
        <div className="text-sm text-muted-foreground">Анализируем совместимость...</div>
      )}

      {matrix && !matrixLoading && (
        <div className="space-y-4">
          <div className="border rounded-xl p-5 bg-card space-y-2" data-testid="card-overall-score">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Общая совместимость набора</span>
              <span className={`text-sm font-semibold ${strengthTextColor(matrix.overallScore)}`}>
                {strengthLabel(matrix.overallScore)} · {Math.round(matrix.overallScore * 100)}%
              </span>
            </div>
            <StrengthBar value={matrix.overallScore} />
            <p className="text-xs text-muted-foreground pt-1">
              Среднее значение по всем парам ({matrix.pairs.length} {matrix.pairs.length === 1 ? "пара" : matrix.pairs.length < 5 ? "пары" : "пар"})
            </p>
          </div>

          <div className="space-y-3" data-testid="list-pair-results">
            {matrix.pairs.map((pair) => {
              const nameA = nameMap.get(pair.ingredientAId) ?? pair.ingredientAId;
              const nameB = nameMap.get(pair.ingredientBId) ?? pair.ingredientBId;
              return (
                <div
                  key={`${pair.ingredientAId}-${pair.ingredientBId}`}
                  className="border rounded-xl p-4 bg-card space-y-2"
                  data-testid={`card-pair-${pair.ingredientAId}-${pair.ingredientBId}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium text-sm flex-wrap">
                      <span>{nameA}</span>
                      <span className="text-muted-foreground">+</span>
                      <span>{nameB}</span>
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap ${strengthTextColor(pair.strength)}`}>
                      {strengthLabel(pair.strength)}
                    </span>
                  </div>

                  <StrengthBar value={pair.strength} />

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                    <SourceBadge source={pair.source} />
                    <div className="flex items-center gap-3">
                      {pair.sharedCompoundCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <FlaskConical className="w-3 h-3" />
                          {pair.sharedCompoundCount} соединений
                        </span>
                      )}
                      {pair.recipeCooccurrenceCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <UtensilsCrossed className="w-3 h-3" />
                          {pair.recipeCooccurrenceCount.toLocaleString("ru")} рецептов
                        </span>
                      )}
                      {pair.sharedCompoundCount === 0 && pair.recipeCooccurrenceCount === 0 && (
                        <span>Нет данных</span>
                      )}
                    </div>
                  </div>

                  {pair.note && (
                    <p className="text-xs text-muted-foreground border-t pt-2 mt-1">{pair.note}</p>
                  )}
                  {pair.category && (
                    <Badge variant="outline" className="text-xs">{pair.category}</Badge>
                  )}

                  <PairRecipes nameA={nameA} nameB={nameB} />

                  {pair.sharedCompoundCount >= 3 && (
                    <PairBridgeSuggestions
                      ingredientAId={pair.ingredientAId}
                      ingredientBId={pair.ingredientBId}
                      nameA={nameA}
                      nameB={nameB}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
