import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Beaker, Check, AlertTriangle } from "lucide-react";
import { ConnectionLine } from "@/components/connection-line";
import type { PairingWithIngredients } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PairingCardProps {
  pairing: PairingWithIngredients;
  onDelete: () => void;
  isDeleting: boolean;
}

export function PairingCard({ pairing, onDelete, isDeleting }: PairingCardProps) {
  const strengthPercent = Math.round((pairing.strength ?? 0) * 100);

  return (
    <Card className="p-3 space-y-2" data-testid={`card-pairing-${pairing.id}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block truncate">
                {pairing.ingredientA.nameRu}
              </span>
              {pairing.ingredientA.familyRu && (
                <span className="text-xs text-muted-foreground">
                  {pairing.ingredientA.familyRu}
                </span>
              )}
            </div>

            <ConnectionLine strength={pairing.strength ?? 0} />

            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block truncate">
                {pairing.ingredientB.nameRu}
              </span>
              {pairing.ingredientB.familyRu && (
                <span className="text-xs text-muted-foreground">
                  {pairing.ingredientB.familyRu}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={pairing.isStable ? "default" : "secondary"}
                  className="text-xs"
                  data-testid={`badge-stability-${pairing.id}`}
                >
                  {pairing.isStable ? (
                    <Check className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}
                  {pairing.isStable ? "Устойчивая" : "Неустойчивая"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {pairing.isStable
                    ? "Ингредиенты имеют достаточно общих молекул для хорошего сочетания"
                    : "У ингредиентов мало общих молекул - сочетание может быть нестабильным"}
                </p>
              </TooltipContent>
            </Tooltip>

            <span className="text-xs text-muted-foreground">
              {strengthPercent}% совпадение
            </span>

            {pairing.sharedCompoundCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    <Beaker className="w-3 h-3 mr-1" />
                    {pairing.sharedCompoundCount} общих
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="text-xs font-medium mb-1">Общие молекулы:</p>
                    {pairing.sharedCompounds.map((c) => (
                      <p key={c.id} className="text-xs text-muted-foreground">
                        {c.nameRu} {c.nameEn ? `(${c.nameEn})` : ""}
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          data-testid={`button-delete-pairing-${pairing.id}`}
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0 text-muted-foreground"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
