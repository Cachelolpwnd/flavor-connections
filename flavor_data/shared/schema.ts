import { pgTable, text, varchar, boolean, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sources = pgTable("sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  url: text("url"),
});

export const aromaCompounds = pgTable("aroma_compounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en"),
  pubchemCid: integer("pubchem_cid"),
});

export const sensoryTags = pgTable("sensory_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameRu: text("name_ru").notNull().unique(),
});

export const ingredients = pgTable("ingredients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en"),
  descriptionRu: text("description_ru"),
  familyRu: text("family_ru"),
  isAlcohol: boolean("is_alcohol").default(false),
  sourceId: varchar("source_id").references(() => sources.id),
});

export const ingredientCompounds = pgTable(
  "ingredient_compounds",
  {
    ingredientId: varchar("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    compoundId: varchar("compound_id")
      .notNull()
      .references(() => aromaCompounds.id, { onDelete: "cascade" }),
    isKey: boolean("is_key").default(false),
    evidence: text("evidence"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.ingredientId, t.compoundId] }),
  })
);

export const ingredientTags = pgTable(
  "ingredient_tags",
  {
    ingredientId: varchar("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id")
      .notNull()
      .references(() => sensoryTags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.ingredientId, t.tagId] }),
  })
);

// Relations
export const ingredientsRelations = relations(ingredients, ({ one, many }) => ({
  source: one(sources, {
    fields: [ingredients.sourceId],
    references: [sources.id],
  }),
  compounds: many(ingredientCompounds),
  tags: many(ingredientTags),
}));

export const aromaCompoundsRelations = relations(aromaCompounds, ({ many }) => ({
  ingredients: many(ingredientCompounds),
}));

export const sensoryTagsRelations = relations(sensoryTags, ({ many }) => ({
  ingredients: many(ingredientTags),
}));

export const insertIngredientSchema = createInsertSchema(ingredients).omit({
  id: true,
});
export const insertAromaCompoundSchema = createInsertSchema(aromaCompounds).omit({
  id: true,
});
export const insertSensoryTagSchema = createInsertSchema(sensoryTags).omit({
  id: true,
});
export const insertSourceSchema = createInsertSchema(sources).omit({ id: true });

export type CreateIngredientRequest = z.infer<typeof insertIngredientSchema>;
export type UpdateIngredientRequest = Partial<CreateIngredientRequest>;
export type CreateAromaCompoundRequest = z.infer<
  typeof insertAromaCompoundSchema
>;
export type CreateSensoryTagRequest = z.infer<typeof insertSensoryTagSchema>;
export type CreateSourceRequest = z.infer<typeof insertSourceSchema>;

// Types
export type Source = typeof sources.$inferSelect;
export type AromaCompound = typeof aromaCompounds.$inferSelect;
export type SensoryTag = typeof sensoryTags.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;

export type IngredientDetail = Ingredient & {
  source: Source | null;
  compounds: { compound: AromaCompound; isKey: boolean | null; evidence: string | null }[];
  tags: SensoryTag[];
};

export type IngredientBridge = {
  fromIngredientId: string;
  toIngredientId: string;
  sharedCompoundCount: number;
  sharedCompounds: AromaCompound[];
};

export interface IngredientsQuery {
  q?: string;
  tagId?: string;
  compoundId?: string;
  familyRu?: string;
  limit?: number;
  offset?: number;
}
