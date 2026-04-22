import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insertSourceSchema, type CreateSourceRequest } from "@shared/schema";

const formSchema = insertSourceSchema.extend({
  title: z.string().min(1, "Обязательное поле"),
  url: z.string().url("Некорректный URL").nullable().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface SourceFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isPending?: boolean;
  onSubmit: (data: CreateSourceRequest) => void;
}

export function SourceFormDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: SourceFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      url: "",
    },
  });

  function handleSubmit(values: FormValues) {
    const data: any = { ...values };
    if (!data.url) data.url = null;
    onSubmit(data);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Новый источник</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input data-testid="input-source-title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input data-testid="input-source-url" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              data-testid="button-submit-source"
              className="rounded-xl btn-sheen bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-lg shadow-accent/20"
            >
              {isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
