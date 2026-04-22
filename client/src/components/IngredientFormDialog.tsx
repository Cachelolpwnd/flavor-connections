import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertIngredientSchema, type Source, type Ingredient, type CreateIngredientRequest, type UpdateIngredientRequest } from "@shared/schema";

const formSchema = insertIngredientSchema.extend({
  nameRu: z.string().min(1, "Обязательное поле"),
});

type FormValues = z.infer<typeof formSchema>;

interface IngredientFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  sources: Source[];
  initial?: Ingredient | null;
  isPending?: boolean;
  onSubmit: (data: CreateIngredientRequest | UpdateIngredientRequest) => void;
}

export function IngredientFormDialog({
  open,
  onOpenChange,
  mode,
  sources,
  initial,
  isPending,
  onSubmit,
}: IngredientFormDialogProps) {
  const defaults = useMemo(
    () => ({
      nameRu: initial?.nameRu ?? "",
      nameEn: initial?.nameEn ?? "",
      familyRu: initial?.familyRu ?? "",
      sourceId: initial?.sourceId ?? "",
      descriptionRu: initial?.descriptionRu ?? "",
      isAlcohol: initial?.isAlcohol ?? false,
    }),
    [initial],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  function handleSubmit(values: FormValues) {
    const data: any = { ...values };
    if (!data.sourceId) data.sourceId = null;
    if (!data.nameEn) data.nameEn = null;
    if (!data.familyRu) data.familyRu = null;
    if (!data.descriptionRu) data.descriptionRu = null;
    onSubmit(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {mode === "create" ? "Новый ингредиент" : "Редактировать ингредиент"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nameRu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название (рус.)</FormLabel>
                    <FormControl>
                      <Input data-testid="input-name-ru" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название (англ.)</FormLabel>
                    <FormControl>
                      <Input data-testid="input-name-en" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="familyRu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Семейство</FormLabel>
                    <FormControl>
                      <Input data-testid="input-family-ru" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Источник</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-source">
                          <SelectValue placeholder="Выберите источник" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sources.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="descriptionRu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea data-testid="input-description" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isAlcohol"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch
                      data-testid="switch-is-alcohol"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Алкоголь</FormLabel>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              data-testid="button-submit-ingredient"
              className="rounded-xl btn-sheen bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20"
            >
              {isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
