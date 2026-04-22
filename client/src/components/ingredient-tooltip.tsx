import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Atom, Tag, Beaker } from "lucide-react";
import type { Ingredient, IngredientDetail } from "@shared/schema";

interface IngredientTooltipProps {
  ingredient: Ingredient;
  children: React.ReactNode;
}

export function IngredientTooltip({ ingredient, children }: IngredientTooltipProps) {
  const [open, setOpen] = useState(false);

  const { data: detail, isLoading } = useQuery<IngredientDetail>({
    queryKey: ["/api/ingredients", ingredient.id],
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          data-testid={`tooltip-trigger-${ingredient.id}`}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        side="right"
        align="start"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        sideOffset={8}
      >
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ) : detail ? (
          <div className="space-y-0">
            <div className="p-4 border-b">
              <h4 className="font-semibold text-sm">{detail.nameRu}</h4>
              {detail.nameEn && (
                <span className="text-xs text-muted-foreground">{detail.nameEn}</span>
              )}
              {detail.descriptionRu && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {detail.descriptionRu}
                </p>
              )}
              {detail.familyRu && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {detail.familyRu}
                </Badge>
              )}
            </div>

            {detail.tags.length > 0 && (
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Сенсорные теги</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {detail.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="text-xs">
                      {tag.nameRu}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {detail.compounds.length > 0 && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Atom className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Молекулы ({detail.compounds.length})
                  </span>
                </div>
                <div className="space-y-1 max-h-[160px] overflow-auto">
                  {detail.compounds.map((c) => (
                    <div
                      key={c.compound.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Beaker className={`w-3 h-3 shrink-0 ${c.isKey ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={c.isKey ? "font-medium" : "text-muted-foreground"}>
                        {c.compound.nameRu}
                      </span>
                      {c.compound.nameEn && (
                        <span className="text-muted-foreground ml-auto truncate max-w-[100px]">
                          {c.compound.nameEn}
                        </span>
                      )}
                      {c.isKey && (
                        <Badge variant="default" className="text-[10px] px-1 py-0 ml-1 shrink-0">
                          key
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
