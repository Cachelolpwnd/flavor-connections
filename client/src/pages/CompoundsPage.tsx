import { useState } from "react";
import { useCompounds, useCreateCompound } from "@/hooks/use-compounds";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/SectionCard";
import { StatPill } from "@/components/StatPill";
import { EmptyState } from "@/components/EmptyState";
import { CompoundFormDialog } from "@/components/CompoundFormDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, FlaskConical, ExternalLink, Loader2 } from "lucide-react";

export default function CompoundsPage() {
  const [search, setSearch] = useState("");
  const { data: compounds, isLoading } = useCompounds(search);
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const createMutation = useCreateCompound();

  const filtered = compounds ?? [];

  return (
    <div className="flex flex-col h-full p-4 gap-4 anim-in">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-serif font-semibold tracking-tight" data-testid="text-page-title">
          Аромамолекулы
        </h1>
        {compounds && (
          <StatPill icon={FlaskConical} label="Всего" value={filtered.length} />
        )}
        <div className="ml-auto">
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-compound">
            <Plus className="w-4 h-4 mr-1.5" />
            Новая молекула
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
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="Молекулы не найдены"
            description="Попробуйте изменить поисковый запрос или добавьте новую молекулу"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {filtered.map((compound) => (
              <div
                key={compound.id}
                className="p-3 rounded-md border space-y-1.5 hover-elevate"
                data-testid={`card-compound-${compound.id}`}
              >
                <p className="text-sm font-medium truncate" data-testid={`text-compound-name-${compound.id}`}>
                  {compound.nameRu}
                </p>
                {compound.nameEn && (
                  <p className="text-xs text-muted-foreground truncate" data-testid={`text-compound-name-en-${compound.id}`}>
                    {compound.nameEn}
                  </p>
                )}
                {compound.pubchemCid && (
                  <a
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.pubchemCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
                    data-testid={`link-pubchem-${compound.id}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    PubChem {compound.pubchemCid}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <CompoundFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={createMutation.isPending}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => {
              setCreateOpen(false);
              toast({ title: "Молекула создана" });
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
