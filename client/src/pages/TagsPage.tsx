import { useState } from "react";
import { useTags, useCreateTag } from "@/hooks/use-tags";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/SectionCard";
import { StatPill } from "@/components/StatPill";
import { EmptyState } from "@/components/EmptyState";
import { TagFormDialog } from "@/components/TagFormDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Tag, Loader2 } from "lucide-react";

export default function TagsPage() {
  const [search, setSearch] = useState("");
  const { data: tags, isLoading } = useTags(search);
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const createMutation = useCreateTag();

  const filtered = tags ?? [];

  return (
    <div className="flex flex-col h-full p-4 gap-4 anim-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-serif font-semibold tracking-tight" data-testid="text-page-title">
          Сенсорные теги
        </h1>
        {tags && (
          <StatPill icon={Tag} label="Всего" value={filtered.length} />
        )}
        <div className="ml-auto">
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-tag">
            <Plus className="w-4 h-4 mr-1.5" />
            Новый тег
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
          <div className="flex flex-wrap gap-2 mt-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Теги не найдены"
            description="Попробуйте изменить поисковый запрос или создайте новый тег"
          />
        ) : (
          <div className="flex flex-wrap gap-2 mt-4">
            {filtered.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-sm"
                data-testid={`badge-tag-${tag.id}`}
              >
                {tag.nameRu}
              </Badge>
            ))}
          </div>
        )}
      </SectionCard>

      <TagFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={createMutation.isPending}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => {
              setCreateOpen(false);
              toast({ title: "Тег создан" });
            },
            onError: () => {
              toast({ title: "Ошибка создания", variant: "destructive" });
            },
          });
        }}
      />
    </div>
  );
}
