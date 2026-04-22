import { useState, useMemo } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, ExternalLink, ChefHat, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

type Recipe = {
  id: string;
  url: string;
  name: string;
  category: string;
  ingredients_raw: string;
};

type CategoryStat = {
  category: string;
  count: string;
};

function parseIngredients(raw: string): string[] {
  const matches = [...raw.matchAll(/'([^']+)'(?:\s*:)/g)];
  return matches.map((m) => m[1].trim()).filter(Boolean);
}

const PAGE_SIZE = 30;

export default function RecipesPage() {
  const searchStr = useSearch();
  const urlParams = useMemo(() => {
    const raw = searchStr || "";
    return new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => urlParams.get("category") || null);
  const [search, setSearch] = useState("");
  const [ingredientFilter, setIngredientFilter] = useState(() => urlParams.get("ingredient") || "");
  const [ingredientSearch, setIngredientSearch] = useState(() => urlParams.get("ingredient") || "");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: categories } = useQuery<CategoryStat[]>({
    queryKey: ["/api/recipes/categories"],
    queryFn: () => apiRequest("GET", "/api/recipes/categories").then((r) => r.json()),
  });

  const params = new URLSearchParams();
  if (selectedCategory) params.set("category", selectedCategory);
  if (search.trim()) params.set("q", search.trim());
  if (ingredientFilter.trim()) params.set("ingredient", ingredientFilter.trim());
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(page * PAGE_SIZE));

  const { data: recipesData, isLoading } = useQuery<{ total: number; items: Recipe[] }>({
    queryKey: ["/api/recipes", selectedCategory, search, ingredientFilter, page],
    queryFn: () => apiRequest("GET", `/api/recipes?${params.toString()}`).then((r) => r.json()),
  });

  const totalPages = recipesData ? Math.ceil(recipesData.total / PAGE_SIZE) : 0;

  function handleCategoryClick(cat: string) {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
    setPage(0);
  }

  function handleSearchSubmit() {
    setPage(0);
  }

  function applyIngredientFilter() {
    setIngredientFilter(ingredientSearch);
    setPage(0);
  }

  function clearFilters() {
    setSelectedCategory(null);
    setSearch("");
    setIngredientFilter("");
    setIngredientSearch("");
    setPage(0);
  }

  const hasFilters = selectedCategory || search.trim() || ingredientFilter.trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-1" data-testid="text-recipes-title">
          Рецепты
        </h1>
        <p className="text-sm text-muted-foreground">
          {recipesData?.total !== undefined
            ? `${recipesData.total.toLocaleString("ru-RU")} рецептов с Поварёнка`
            : "145 000+ рецептов"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Поиск по названию рецепта..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            data-testid="input-recipe-search"
          />
        </div>
        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <ChefHat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Фильтр по ингредиенту..."
              value={ingredientSearch}
              onChange={(e) => setIngredientSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyIngredientFilter()}
              data-testid="input-ingredient-filter"
            />
          </div>
          <Button variant="outline" onClick={applyIngredientFilter} data-testid="button-apply-ingredient-filter">
            Найти
          </Button>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} data-testid="button-clear-filters">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {ingredientFilter && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ингредиент:</span>
          <Badge variant="secondary" className="gap-1">
            {ingredientFilter}
            <button onClick={() => { setIngredientFilter(""); setIngredientSearch(""); setPage(0); }}>
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}

      {categories && (
        <div className="flex flex-wrap gap-2" data-testid="list-categories">
          {categories.map((cat) => (
            <button
              key={cat.category}
              onClick={() => handleCategoryClick(cat.category)}
              data-testid={`button-category-${cat.category}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selectedCategory === cat.category
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-foreground border-border hover:bg-accent"
              }`}
            >
              {cat.category}
              <span className="text-xs opacity-60">
                {Number(cat.count).toLocaleString("ru-RU")}
              </span>
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && recipesData?.items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Рецепты не найдены. Попробуйте изменить запрос.
        </div>
      )}

      {!isLoading && recipesData && recipesData.items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-recipes">
          {recipesData.items.map((recipe) => {
            const ings = parseIngredients(recipe.ingredients_raw);
            const isExpanded = expandedId === recipe.id;
            return (
              <div
                key={recipe.id}
                className="border rounded-xl p-4 bg-card hover:border-foreground/30 transition-colors cursor-pointer space-y-2"
                onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                data-testid={`card-recipe-${recipe.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm leading-snug flex-1">{recipe.name}</h3>
                  <a
                    href={recipe.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    data-testid={`link-recipe-${recipe.id}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <Badge variant="outline" className="text-xs">
                  {recipe.category}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {ings.length} ингредиентов
                  {!isExpanded && ings.length > 0 && (
                    <span className="ml-1">· {ings.slice(0, 3).join(", ")}{ings.length > 3 ? "..." : ""}</span>
                  )}
                </div>
                {isExpanded && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {ings.map((ing) => (
                      <Badge key={ing} variant="secondary" className="text-xs py-0">
                        {ing}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2" data-testid="pagination">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            data-testid="button-prev-page"
          >
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            data-testid="button-next-page"
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
}
