import { useState } from "react";
import { useIngredients, useCreateIngredient, useUpdateIngredient, useDeleteIngredient } from "@/hooks/use-ingredients";
import { useSourcesList } from "@/hooks/use-sources";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/SectionCard";
import { StatPill } from "@/components/StatPill";
import { EmptyState } from "@/components/EmptyState";
import { IngredientFormDialog } from "@/components/IngredientFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Leaf, Pencil, Trash2, Wine, Loader2, ExternalLink } from "lucide-react";
import type { Ingredient } from "@shared/schema";

export default function IngredientsPage() {
  const [search, setSearch] = useState("");
  const { data: ingredients, isLoading } = useIngredients(search);
  const { data: sources } = useSourcesList();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  const createMutation = useCreateIngredient();
  const deleteMutation = useDeleteIngredient();

  const filtered = ingredients ?? [];

  return (
    <div className="flex flex-col h-full p-4 gap-4 anim-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-serif font-semibold tracking-tight" data-testid="text-page-title">
          Ингредиенты
        </h1>
        {ingredients && (
          <StatPill icon={Leaf} label="Всего" value={filtered.length} />
        )}
        <div className="ml-auto">
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-ingredient">
            <Plus className="w-4 h-4 mr-1.5" />
            Новый ингредиент
          </Button>
        </div>
      </div>

      <SectionCard>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="pl-10 rounded-xl"
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Leaf}
            title="Ингредиенты не найдены"
            description="Попробуйте изменить поисковый запрос или создайте новый ингредиент"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {filtered.map((ing) => (
              <div
                key={ing.id}
                className="p-3 rounded-md border space-y-1.5 hover-elevate"
                data-testid={`card-ingredient-${ing.id}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <a
                      href={`https://ru.wikipedia.org/wiki/${encodeURIComponent(ing.nameRu)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1 text-sm font-medium truncate hover:underline"
                      data-testid={`link-ingredient-wiki-${ing.id}`}
                    >
                      <span data-testid={`text-ingredient-name-${ing.id}`}>{ing.nameRu}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                    {ing.nameEn && (
                      <p className="text-xs text-muted-foreground truncate" data-testid={`text-ingredient-name-en-${ing.id}`}>
                        {ing.nameEn}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditTarget(ing)}
                      data-testid={`button-edit-ingredient-${ing.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget(ing)}
                      data-testid={`button-delete-ingredient-${ing.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ing.familyRu && (
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-family-${ing.id}`}>
                      {ing.familyRu}
                    </Badge>
                  )}
                  {ing.isAlcohol && (
                    <Badge variant="outline" className="text-xs gap-1" data-testid={`badge-alcohol-${ing.id}`}>
                      <Wine className="w-3 h-3" />
                      Алкоголь
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <IngredientFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        sources={sources ?? []}
        isPending={createMutation.isPending}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => {
              setCreateOpen(false);
              toast({ title: "Ингредиент создан" });
            },
            onError: () => {
              toast({ title: "Ошибка создания", variant: "destructive" });
            },
          });
        }}
      />

      {editTarget && (
        <EditIngredientWrapper
          ingredient={editTarget}
          sources={sources ?? []}
          onClose={() => setEditTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Удалить ингредиент?"
        description={`Вы уверены, что хотите удалить "${deleteTarget?.nameRu}"?`}
        confirmText="Удалить"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              toast({ title: "Ингредиент удалён" });
            },
            onError: () => {
              toast({ title: "Ошибка удаления", variant: "destructive" });
            },
          });
        }}
        data-testid="dialog-delete-ingredient"
      />
    </div>
  );
}

function EditIngredientWrapper({
  ingredient,
  sources,
  onClose,
}: {
  ingredient: Ingredient;
  sources: import("@shared/schema").Source[];
  onClose: () => void;
}) {
  const updateMutation = useUpdateIngredient(ingredient.id);
  const { toast } = useToast();

  return (
    <IngredientFormDialog
      open
      onOpenChange={(v) => { if (!v) onClose(); }}
      mode="edit"
      sources={sources}
      initial={ingredient}
      isPending={updateMutation.isPending}
      onSubmit={(data) => {
        updateMutation.mutate(data, {
          onSuccess: () => {
            onClose();
            toast({ title: "Ингредиент обновлён" });
          },
          onError: () => {
            toast({ title: "Ошибка обновления", variant: "destructive" });
          },
        });
      }}
    />
  );
}
