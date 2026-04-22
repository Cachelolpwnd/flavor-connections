import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insertSensoryTagSchema, type CreateSensoryTagRequest } from "@shared/schema";

const formSchema = insertSensoryTagSchema.extend({
  nameRu: z.string().min(1, "Обязательное поле"),
});

type FormValues = z.infer<typeof formSchema>;

interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isPending?: boolean;
  onSubmit: (data: CreateSensoryTagRequest) => void;
}

export function TagFormDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: TagFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nameRu: "",
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit(values);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Новый тег</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nameRu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input data-testid="input-tag-name-ru" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              data-testid="button-submit-tag"
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
