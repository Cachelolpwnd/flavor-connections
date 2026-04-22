import { pgTable, text, varchar, boolean, integer, primaryKey, real } from "drizzle-orm/pg-core";
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

export const cuisineTags = pgTable("cuisine_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameRu: text("name_ru").notNull().unique(),
  nameEn: text("name_en"),
  emoji: text("emoji"),
});

export const ingredientCuisineTags = pgTable(
  "ingredient_cuisine_tags",
  {
    ingredientId: varchar("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    cuisineTagId: varchar("cuisine_tag_id")
      .notNull()
      .references(() => cuisineTags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.ingredientId, t.cuisineTagId] }),
  })
);

export const cuisineTagsRelations = relations(cuisineTags, ({ many }) => ({
  ingredients: many(ingredientCuisineTags),
}));

export const ingredientPairings = pgTable(
  "ingredient_pairings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    ingredientAId: varchar("ingredient_a_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    ingredientBId: varchar("ingredient_b_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    strength: real("strength").notNull().default(0),
    isStable: boolean("is_stable").default(false),
    note: text("note"),
    category: text("category"),
  }
);

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

export const insertPairingSchema = createInsertSchema(ingredientPairings).omit({
  id: true,
});
export const insertCuisineTagSchema = createInsertSchema(cuisineTags).omit({
  id: true,
});

export type CreateIngredientRequest = z.infer<typeof insertIngredientSchema>;
export type UpdateIngredientRequest = Partial<CreateIngredientRequest>;
export type CreateAromaCompoundRequest = z.infer<typeof insertAromaCompoundSchema>;
export type CreateSensoryTagRequest = z.infer<typeof insertSensoryTagSchema>;
export type CreateSourceRequest = z.infer<typeof insertSourceSchema>;
export type CreatePairingRequest = z.infer<typeof insertPairingSchema>;
export type CreateCuisineTagRequest = z.infer<typeof insertCuisineTagSchema>;

export type Source = typeof sources.$inferSelect;
export type AromaCompound = typeof aromaCompounds.$inferSelect;
export type SensoryTag = typeof sensoryTags.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type IngredientPairing = typeof ingredientPairings.$inferSelect;
export type CuisineTag = typeof cuisineTags.$inferSelect;

export type IngredientDetail = Ingredient & {
  source: Source | null;
  compounds: { compound: AromaCompound; isKey: boolean | null; evidence: string | null }[];
  tags: SensoryTag[];
};

export type IngredientBridge = {
  fromIngredientId: string;
  toIngredientId: string;
  toIngredientName: string;
  sharedCompoundCount: number;
  sharedCompounds: AromaCompound[];
};

export type PairingWithIngredients = IngredientPairing & {
  ingredientA: Ingredient;
  ingredientB: Ingredient;
  sharedCompounds: AromaCompound[];
  sharedCompoundCount: number;
  category?: string | null;
};

export type FlavorPairingResult = {
  ingredientAId: string;
  ingredientBId: string;
  ingredientAName: string;
  ingredientBName: string;
  strength: number;
  isStable: boolean | null;
  note: string | null;
  category: string | null;
  sharedCompounds: AromaCompound[];
  sharedCompoundCount: number;
};

export interface IngredientsQuery {
  q?: string;
  tagId?: string;
  compoundId?: string;
  familyRu?: string;
  limit?: number;
  offset?: number;
}

export * from "./models/auth";

export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").unique(),
  name: text("name").notNull(),
  category: text("category"),
  ingredientsRaw: text("ingredients_raw").notNull(),
});

export const ingredientCooccurrence = pgTable(
  "ingredient_cooccurrence",
  {
    ingredientA: text("ingredient_a").notNull(),
    ingredientB: text("ingredient_b").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.ingredientA, t.ingredientB] }),
  })
);

export type Recipe = typeof recipes.$inferSelect;
export type IngredientCooccurrence = typeof ingredientCooccurrence.$inferSelect;

export const userSavedPairings = pgTable(
  "user_saved_pairings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    pairingId: varchar("pairing_id")
      .notNull()
      .references(() => ingredientPairings.id, { onDelete: "cascade" }),
    savedAt: text("saved_at").notNull().default(sql`now()`),
  }
);

export const insertUserSavedPairingSchema = createInsertSchema(userSavedPairings).omit({
  id: true,
  savedAt: true,
});

export type UserSavedPairing = typeof userSavedPairings.$inferSelect;
export type CreateUserSavedPairingRequest = z.infer<typeof insertUserSavedPairingSchema>;
