import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { insertAromaCompoundSchema, type CreateAromaCompoundRequest } from "@shared/schema";

const formSchema = insertAromaCompoundSchema.extend({
  nameRu: z.string().min(1, "Обязательное поле"),
  pubchemCid: z.coerce.number().int().positive().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CompoundFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isPending?: boolean;
  onSubmit: (data: CreateAromaCompoundRequest) => void;
}

export function CompoundFormDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: CompoundFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nameRu: "",
      nameEn: "",
      pubchemCid: null,
    },
  });

  function handleSubmit(values: FormValues) {
    const data: any = { ...values };
    if (!data.nameEn) data.nameEn = null;
    const cid = Number(data.pubchemCid);
    data.pubchemCid = isNaN(cid) ? null : cid;
    onSubmit(data);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Новая молекула</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nameRu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название (рус.)</FormLabel>
                  <FormControl>
                    <Input data-testid="input-compound-name-ru" {...field} />
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
                    <Input data-testid="input-compound-name-en" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pubchemCid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PubChem CID</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-compound-pubchem-cid"
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? null : Number(val));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              data-testid="button-submit-compound"
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
