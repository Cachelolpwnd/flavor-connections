import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Beaker, Tag, BookOpen, ExternalLink, Zap, Loader2, Link2, Plus, Search, Check, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { IngredientDetail, IngredientPairing, Ingredient, IngredientBridge } from "@shared/schema";

function autoStrengthFromCompounds(sharedCount: number): { level: StrengthLevel; value: number } {
  if (sharedCount >= 5) return { level: "strong", value: 0.9 };
  if (sharedCount >= 3) return { level: "medium", value: 0.6 };
  return { level: "weak", value: 0.3 };
}

export interface CreatedLink {
  source: string;
  target: string;
  strength: number;
  category: string | null;
  note: string | null;
}

interface IngredientDetailPanelProps {
  ingredientId: string | null;
  onClose: () => void;
  onLinkCreated?: (link: CreatedLink) => void;
  basket?: Array<{ id: string; name: string }>;
  onRemoveFromBasket?: (id: string) => void;
}

function getWikipediaUrl(nameRu: string): string {
  const encoded = encodeURIComponent(nameRu);
  return `https://ru.wikipedia.org/wiki/${encoded}`;
}

const categoryLabels: Record<string, string> = {
  "классика": "Классика",
  "современный": "Современный",
  "авангард": "Авангард",
};

const categoryBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  "классика": "default",
  "современный": "secondary",
  "авангард": "outline",
};

type StrengthLevel = "strong" | "medium" | "weak";
const strengthValues: Record<StrengthLevel, number> = {
  strong: 0.9,
  medium: 0.6,
  weak: 0.3,
};
const strengthLabels: Record<StrengthLevel, string> = {
  strong: "Сильное",
  medium: "Среднее",
  weak: "Слабое",
};
const strengthColors: Record<StrengthLevel, string> = {
  strong: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  weak: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
};

function StrengthSelector({
  value,
  onChange,
  testIdPrefix,
}: {
  value: StrengthLevel;
  onChange: (v: StrengthLevel) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex gap-1" data-testid={`strength-selector-${testIdPrefix}`}>
      {(["strong", "medium", "weak"] as StrengthLevel[]).map((level) => (
        <button
          key={level}
          onClick={() => onChange(level)}
          className={`flex-1 text-[10px] py-1 rounded-md border transition-colors ${
            value === level
              ? strengthColors[level]
              : "border-transparent text-muted-foreground hover-elevate"
          }`}
          data-testid={`button-strength-${testIdPrefix}-${level}`}
        >
          {strengthLabels[level]}
        </button>
      ))}
    </div>
  );
}

export function IngredientDetailPanel({ ingredientId, onClose, onLinkCreated, basket = [], onRemoveFromBasket }: IngredientDetailPanelProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showBridges, setShowBridges] = useState(false);
  const [bridgeSearch, setBridgeSearch] = useState("");
  const [manualSearchOpen, setManualSearchOpen] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [manualTargetId, setManualTargetId] = useState<string | null>(null);
  const [manualTargetName, setManualTargetName] = useState<string>("");
  const [manualStrength, setManualStrength] = useState<StrengthLevel>("medium");
  const [prevIngredientId, setPrevIngredientId] = useState(ingredientId);
  if (ingredientId !== prevIngredientId) {
    setPrevIngredientId(ingredientId);
    setShowBridges(false);
    setBridgeSearch("");
    setManualSearchOpen(false);
    setManualTargetId(null);
    setManualSearchQuery("");
  }

  const { data: detail, isLoading } = useQuery<IngredientDetail>({
    queryKey: ["/api/ingredients", ingredientId],
    enabled: !!ingredientId,
  });

  const { data: pairings, isLoading: pairingsLoading } = useQuery<Array<{ pairing: IngredientPairing; partner: Ingredient }>>({
    queryKey: ["/api/ingredients", ingredientId, "pairings"],
    queryFn: async () => {
      const res = await fetch(`/api/ingredients/${ingredientId}/pairings`);
      if (!res.ok) throw new Error("Failed to load pairings");
      return res.json();
    },
    enabled: !!ingredientId,
  });

  const { data: bridges, isLoading: bridgesLoading } = useQuery<IngredientBridge[]>({
    queryKey: ["/api/ingredients", ingredientId, "bridges"],
    enabled: !!ingredientId && showBridges,
  });

  const { data: allIngredients } = useQuery<Array<{ id: string; nameRu: string }>>({
    queryKey: ["/api/ingredients", { q: manualSearchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (manualSearchQuery) params.set("q", manualSearchQuery);
      const res = await fetch(`/api/ingredients?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: manualSearchOpen,
  });

  const { data: recipePairs } = useQuery<Array<{ id: number; name: string; category: string }>>({
    queryKey: ["/api/recipes/pairs", detail?.nameRu, manualTargetName],
    queryFn: async () => {
      if (!detail?.nameRu || !manualTargetName) return [];
      const params = new URLSearchParams({ a: detail.nameRu, b: manualTargetName });
      const res = await fetch(`/api/recipes/pairs?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!detail?.nameRu && !!manualTargetName && !!manualTargetId,
  });

  const { data: recipeCount, isLoading: recipeCountLoading } = useQuery<number>({
    queryKey: ["/api/recipes/count", detail?.nameRu],
    queryFn: async () => {
      if (!detail?.nameRu) return 0;
      const normalize = (s: string) => s.replace(/ё/gi, "е");
      const name = normalize(detail.nameRu);
      const params = new URLSearchParams({ ingredient: name, limit: "1" });
      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.total ?? 0;
    },
    enabled: !!detail?.nameRu,
  });

  const filteredIngredients = (allIngredients || [])
    .filter(ing => ing.id !== ingredientId)
    .slice(0, 10);

  const createPairingMutation = useMutation({
    mutationFn: async (data: { ingredientAId: string; ingredientBId: string; manualStrength?: number }) => {
      const res = await apiRequest("POST", "/api/pairings", data);
      return { response: res, request: data };
    },
    onSuccess: ({ request }) => {
      toast({ title: "Связь создана" });
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients", ingredientId, "pairings"] });
      if (onLinkCreated && ingredientId) {
        onLinkCreated({
          source: request.ingredientAId,
          target: request.ingredientBId,
          strength: request.manualStrength ?? 0.6,
          category: null,
          note: null,
        });
      }
      setManualTargetId(null);
      setManualSearchOpen(false);
      setManualSearchQuery("");
    },
    onError: () => {
      toast({ title: "Не удалось создать связь", variant: "destructive" });
    },
  });

  if (!ingredientId) return null;

  const existingPartnerIds = new Set(pairings?.map(p => p.partner.id) || []);
  const newBridges = bridges?.filter(b => !existingPartnerIds.has(b.toIngredientId)) || [];
  const bridgeSearchLower = bridgeSearch.toLowerCase().trim();
  const filteredBridges = bridgeSearchLower
    ? newBridges.filter(b => b.toIngredientName.toLowerCase().includes(bridgeSearchLower))
    : newBridges;

  return (
    <div
      className="absolute right-3 top-3 w-[320px] max-h-[calc(100vh-8rem)] overflow-y-auto glass rounded-xl shadow-elev anim-in z-10"
      data-testid="ingredient-detail-panel"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            ) : detail ? (
              <>
                <a
                  href={getWikipediaUrl(detail.nameRu)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5"
                  data-testid="link-ingredient-wiki"
                >
                  <h2
                    className="font-serif text-lg font-semibold leading-tight group-hover:underline"
                    data-testid="text-ingredient-name"
                  >
                    {detail.nameRu}
                  </h2>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
                {detail.nameEn && (
                  <p
                    className="text-xs text-muted-foreground mt-0.5"
                    data-testid="text-ingredient-name-en"
                  >
                    {detail.nameEn}
                  </p>
                )}
              </>
            ) : null}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-detail"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : detail ? (
          <>
            {detail.familyRu && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-family">
                {detail.familyRu}
              </Badge>
            )}

            {detail.descriptionRu && (
              <p
                className="text-xs text-muted-foreground leading-relaxed"
                data-testid="text-description"
              >
                {detail.descriptionRu}
              </p>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Связи</span>
                {pairings && (
                  <span className="text-muted-foreground ml-auto">{pairings.length}</span>
                )}
              </div>
              {pairingsLoading ? (
                <div className="space-y-1">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              ) : pairings && pairings.length > 0 ? (
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                  {pairings.map(({ pairing, partner }) => (
                    <div
                      key={pairing.id}
                      className="flex items-center gap-1.5 text-xs p-1.5 rounded-md bg-muted/30"
                      data-testid={`pairing-item-${pairing.id}`}
                    >
                      <span className="font-medium flex-1 min-w-0 truncate">{partner.nameRu}</span>
                      {pairing.category && (
                        <Badge
                          variant={categoryBadgeVariant[pairing.category] || "outline"}
                          className="text-[9px] px-1 py-0 shrink-0"
                        >
                          {categoryLabels[pairing.category] || pairing.category}
                        </Badge>
                      )}
                      <span className="text-muted-foreground shrink-0">
                        {Math.round(pairing.strength * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Нет связей</p>
              )}
            </div>

            {basket.length > 0 && (
              <div className="pt-2 border-t border-border/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span>Список для соединения</span>
                  <span className="ml-auto">{basket.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {basket.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 rounded-full px-2 py-0.5 text-[11px]"
                      data-testid={`basket-chip-${b.id}`}
                    >
                      <span>{b.name}</span>
                      {onRemoveFromBasket && (
                        <button
                          onClick={() => onRemoveFromBasket(b.id)}
                          className="opacity-60 hover:opacity-100 ml-0.5"
                          title="Убрать"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {basket.length >= 2 && (
                  <button
                    onClick={() => navigate(`/compare?ids=${basket.map(b => b.id).join(",")}`)}
                    className="block w-full text-center text-[11px] text-primary hover:underline py-0.5"
                    data-testid="link-compare-basket"
                  >
                    Сравнить выбранные →
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Создать соединение</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setManualSearchOpen(!manualSearchOpen);
                  setManualTargetId(null);
                  setManualSearchQuery("");
                }}
                className="w-full"
                data-testid="button-manual-pairing"
              >
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Выбрать ингредиент вручную
              </Button>

              {manualSearchOpen && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={manualSearchQuery}
                    onChange={(e) => setManualSearchQuery(e.target.value)}
                    placeholder="Поиск ингредиента..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border bg-background"
                    data-testid="input-manual-search"
                  />
                  {manualTargetId ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs p-1.5 rounded-md bg-muted/30">
                        <Check className="w-3 h-3 text-green-600 shrink-0" />
                        <span className="font-medium flex-1">{manualTargetName}</span>
                        <button
                          onClick={() => { setManualTargetId(null); setManualTargetName(""); }}
                          className="text-muted-foreground hover:text-foreground text-[10px]"
                          title="Изменить выбор"
                        >
                          изменить
                        </button>
                      </div>
                      <StrengthSelector
                        value={manualStrength}
                        onChange={setManualStrength}
                        testIdPrefix="manual"
                      />
                      {recipePairs && recipePairs.length > 0 && (
                        <div
                          className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 space-y-1"
                          data-testid="recipe-hint"
                        >
                          <div className="flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            <UtensilsCrossed className="w-3 h-3 shrink-0" />
                            <span>В рецептах встречается вместе ({recipePairs.length}):</span>
                          </div>
                          <div className="space-y-0.5">
                            {recipePairs.slice(0, 3).map((r) => (
                              <p key={r.id} className="text-[10px] text-muted-foreground truncate">
                                · {r.name}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => createPairingMutation.mutate({
                          ingredientAId: ingredientId,
                          ingredientBId: manualTargetId,
                          manualStrength: strengthValues[manualStrength],
                        })}
                        disabled={createPairingMutation.isPending}
                        data-testid="button-confirm-manual-pairing"
                      >
                        {createPairingMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Link2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Установить соединение
                      </Button>
                    </div>
                  ) : (
                    <div className="max-h-[120px] overflow-y-auto space-y-0.5">
                      {filteredIngredients.map((ing) => (
                        <button
                          key={ing.id}
                          onClick={() => {
                            setManualTargetId(ing.id);
                            setManualTargetName(ing.nameRu);
                          }}
                          className="w-full text-left text-xs px-2 py-1 rounded hover-elevate"
                          data-testid={`option-ingredient-${ing.id}`}
                        >
                          {ing.nameRu}
                        </button>
                      ))}
                      {filteredIngredients.length === 0 && manualSearchQuery && (
                        <p className="text-[10px] text-muted-foreground px-2 py-1">Ничего не найдено</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBridges(true)}
                disabled={showBridges && bridgesLoading}
                className="w-full"
                data-testid="button-generate-connections"
              >
                {bridgesLoading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                )}
                Сгенерировать по ароматам
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => detail?.nameRu && navigate(`/recipes?ingredient=${encodeURIComponent(detail.nameRu.replace(/ё/gi, "е"))}`)}
                disabled={recipeCountLoading || !recipeCount || recipeCount === 0}
                className="w-full"
                data-testid="button-find-recipes"
                title={
                  recipeCountLoading
                    ? "Ищем рецепты..."
                    : recipeCount && recipeCount > 0
                    ? `Открыть рецепты с этим ингредиентом`
                    : "Рецептов не найдено"
                }
              >
                {recipeCountLoading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5" />
                )}
                {recipeCountLoading
                  ? "Ищем рецепты..."
                  : recipeCount && recipeCount > 0
                  ? `Рецепты с ингредиентом (${recipeCount.toLocaleString("ru")})`
                  : "Рецептов не найдено"}
              </Button>

              {showBridges && !bridgesLoading && newBridges.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground">
                    Найдено {newBridges.length} потенциальных связей:
                  </p>
                  <input
                    type="text"
                    value={bridgeSearch}
                    onChange={(e) => setBridgeSearch(e.target.value)}
                    placeholder="Поиск по ингредиентам..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border bg-background"
                    data-testid="input-bridge-search"
                  />
                  <div className="max-h-[220px] overflow-y-auto space-y-0.5">
                    {filteredBridges.map((bridge) => {
                      const auto = autoStrengthFromCompounds(bridge.sharedCompoundCount);
                      const strengthLabel = auto.level === "strong" ? "Сильное" : auto.level === "medium" ? "Среднее" : "Слабое";
                      const strengthColor = auto.level === "strong" ? "text-green-600 dark:text-green-400" : auto.level === "medium" ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground";
                      return (
                        <div
                          key={bridge.toIngredientId}
                          className="flex items-center gap-1.5 text-xs p-1.5 rounded-md bg-muted/30"
                          data-testid={`bridge-item-${bridge.toIngredientId}`}
                        >
                          <span className="font-medium flex-1 min-w-0 truncate">
                            {bridge.toIngredientName}
                          </span>
                          <span className={`text-[10px] shrink-0 ${strengthColor}`}>
                            {strengthLabel}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            ({bridge.sharedCompoundCount})
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 shrink-0"
                            onClick={() => createPairingMutation.mutate({
                              ingredientAId: ingredientId,
                              ingredientBId: bridge.toIngredientId,
                              manualStrength: auto.value,
                            })}
                            disabled={createPairingMutation.isPending}
                            title="Создать связь"
                            data-testid={`button-create-bridge-${bridge.toIngredientId}`}
                          >
                            <Link2 className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                    {filteredBridges.length === 0 && bridgeSearch && (
                      <p className="text-[10px] text-muted-foreground px-2 py-1">Ничего не найдено</p>
                    )}
                  </div>
                </div>
              )}

              {showBridges && !bridgesLoading && newBridges.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Все возможные соединения уже существуют
                </p>
              )}
            </div>

            {detail.compounds && detail.compounds.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Ароматические соединения</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {detail.compounds.map((c) => (
                    <Badge
                      key={c.compound.id}
                      variant={c.isKey ? "default" : "outline"}
                      className="text-[10px] px-1.5 py-0"
                      data-testid={`badge-compound-${c.compound.id}`}
                    >
                      {c.compound.nameRu}
                      {c.compound.nameEn ? ` (${c.compound.nameEn})` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {detail.tags && detail.tags.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Сенсорные теги</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {detail.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                      data-testid={`badge-tag-${tag.id}`}
                    >
                      {tag.nameRu}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {detail.source && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-2 border-t border-border/50">
                <BookOpen className="w-3 h-3 shrink-0" />
                <span data-testid="text-source">
                  {detail.source.title}
                  {detail.source.url && (
                    <>
                      {" "}
                      <a
                        href={detail.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        data-testid="link-source"
                      >
                        (ссылка)
                      </a>
                    </>
                  )}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground" data-testid="text-loading">
            Загрузка...
          </p>
        )}
      </div>
    </div>
  );
}
