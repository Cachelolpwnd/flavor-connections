import { expandedCompounds, ingredientDatabase } from "./expanded-seed-data";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, pool } from "./db";
import {
  aromaCompounds,
  cuisineTags,
  ingredientCompounds,
  ingredientCuisineTags,
  ingredientPairings,
  ingredients,
  ingredientTags,
  sensoryTags,
  sources,
  userSavedPairings,
  type AromaCompound,
  type CuisineTag,
  type CreateCuisineTagRequest,
  type FlavorPairingResult,
  type Ingredient,
  type IngredientBridge,
  type IngredientDetail,
  type IngredientPairing,
  type IngredientsQuery,
  type PairingWithIngredients,
  type SensoryTag,
  type Source,
  type CreateIngredientRequest,
  type UpdateIngredientRequest,
  type CreateAromaCompoundRequest,
  type CreateSensoryTagRequest,
  type CreateSourceRequest,
  type UserSavedPairing,
} from "@shared/schema";

export interface IStorage {
  listIngredients(query?: IngredientsQuery): Promise<Ingredient[]>;
  getIngredientDetail(id: string): Promise<IngredientDetail | undefined>;
  getIngredientBridges(
    id: string,
    options?: { minSharedCompounds?: number; limit?: number },
  ): Promise<IngredientBridge[]>;
  listCompounds(query?: { q?: string; limit?: number; offset?: number }): Promise<AromaCompound[]>;
  listTags(query?: { q?: string; limit?: number; offset?: number }): Promise<SensoryTag[]>;
  listSources(): Promise<Source[]>;
  listFamilies(): Promise<string[]>;
  createPairing(ingredientAId: string, ingredientBId: string, note?: string, manualStable?: boolean, manualStrength?: number): Promise<PairingWithIngredients>;
  listPairings(): Promise<PairingWithIngredients[]>;
  deletePairing(id: string): Promise<boolean>;
  checkFlavorPairings(ingredientIds: string[]): Promise<FlavorPairingResult[]>;
  createIngredient(data: CreateIngredientRequest): Promise<Ingredient>;
  updateIngredient(id: string, data: UpdateIngredientRequest): Promise<Ingredient | undefined>;
  deleteIngredient(id: string): Promise<boolean>;
  createCompound(data: CreateAromaCompoundRequest): Promise<AromaCompound>;
  createTag(data: CreateSensoryTagRequest): Promise<SensoryTag>;
  createSource(data: CreateSourceRequest): Promise<Source>;
  listCuisineTags(): Promise<(CuisineTag & { ingredientCount: number })[]>;
  createCuisineTag(data: CreateCuisineTagRequest): Promise<CuisineTag>;
  getCuisineGraph(cuisineTagIds?: string[]): Promise<{
    nodes: Array<{ id: string; nameRu: string; familyRu: string | null }>;
    links: Array<{ source: string; target: string; strength: number; category: string | null; note: string | null }>;
  }>;
  getPairingGraph(): Promise<{
    nodes: Array<{ id: string; nameRu: string; familyRu: string | null }>;
    links: Array<{ source: string; target: string; strength: number; category: string | null; note: string | null }>;
  }>;
  getIngredientPairings(ingredientId: string): Promise<Array<{
    pairing: IngredientPairing;
    partner: Ingredient;
  }>>;
  listUserSavedPairings(userId: string): Promise<Array<{
    saved: UserSavedPairing;
    pairing: IngredientPairing;
    ingredientA: Ingredient;
    ingredientB: Ingredient;
  }>>;
  saveUserPairing(userId: string, pairingId: string): Promise<UserSavedPairing>;
  deleteUserSavedPairing(id: string, userId: string): Promise<boolean>;
  isUserPairingSaved(userId: string, pairingId: string): Promise<boolean>;
  getCompatibilityMatrix(ingredientIds: string[]): Promise<{
    ingredients: Array<{ id: string; nameRu: string; familyRu: string | null }>;
    pairs: Array<{
      ingredientAId: string;
      ingredientBId: string;
      strength: number;
      source: 'database' | 'compounds' | 'none';
      sharedCompoundCount: number;
      note: string | null;
      category: string | null;
    }>;
    overallScore: number;
  }>;
  seedIfEmpty(): Promise<void>;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export class DatabaseStorage implements IStorage {
  async listIngredients(query?: IngredientsQuery): Promise<Ingredient[]> {
    const q = query?.q?.trim();
    const limit = clamp(query?.limit ?? 200, 1, 1000);
    const offset = clamp(query?.offset ?? 0, 0, 100000);

    const where: any[] = [];

    if (q) {
      where.push(ilike(ingredients.nameRu, `%${q}%`));
    }
    if (query?.familyRu) {
      where.push(eq(ingredients.familyRu, query.familyRu));
    }

    if (query?.tagId) {
      const rows = await db
        .select({ ingredientId: ingredientTags.ingredientId })
        .from(ingredientTags)
        .where(eq(ingredientTags.tagId, query.tagId));
      const ids = rows.map((r) => r.ingredientId);
      if (ids.length === 0) return [];
      where.push(inArray(ingredients.id, ids));
    }

    if (query?.compoundId) {
      const rows = await db
        .select({ ingredientId: ingredientCompounds.ingredientId })
        .from(ingredientCompounds)
        .where(eq(ingredientCompounds.compoundId, query.compoundId));
      const ids = rows.map((r) => r.ingredientId);
      if (ids.length === 0) return [];
      where.push(inArray(ingredients.id, ids));
    }

    return await db
      .select()
      .from(ingredients)
      .where(where.length ? and(...where) : undefined)
      .orderBy(asc(ingredients.nameRu))
      .limit(limit)
      .offset(offset);
  }

  async getIngredientDetail(id: string): Promise<IngredientDetail | undefined> {
    const [ingredient] = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, id));

    if (!ingredient) return undefined;

    const [source] = ingredient.sourceId
      ? await db.select().from(sources).where(eq(sources.id, ingredient.sourceId))
      : [undefined];

    const compoundRows = await db
      .select({
        compound: aromaCompounds,
        isKey: ingredientCompounds.isKey,
        evidence: ingredientCompounds.evidence,
      })
      .from(ingredientCompounds)
      .innerJoin(
        aromaCompounds,
        eq(ingredientCompounds.compoundId, aromaCompounds.id),
      )
      .where(eq(ingredientCompounds.ingredientId, id))
      .orderBy(desc(ingredientCompounds.isKey), asc(aromaCompounds.nameRu));

    const tagRows = await db
      .select({ tag: sensoryTags })
      .from(ingredientTags)
      .innerJoin(sensoryTags, eq(ingredientTags.tagId, sensoryTags.id))
      .where(eq(ingredientTags.ingredientId, id))
      .orderBy(asc(sensoryTags.nameRu));

    return {
      ...ingredient,
      source: source ?? null,
      compounds: compoundRows.map((r) => ({
        compound: r.compound,
        isKey: r.isKey,
        evidence: r.evidence,
      })),
      tags: tagRows.map((r) => r.tag),
    };
  }

  async getIngredientBridges(
    id: string,
    options?: { minSharedCompounds?: number; limit?: number },
  ): Promise<IngredientBridge[]> {
    const minShared = clamp(options?.minSharedCompounds ?? 1, 1, 20);
    const finalLimit = clamp(options?.limit ?? 200, 1, 500);
    const MAX_PER_FAMILY = 3;

    const ownCompoundRows = await db
      .select({ compoundId: ingredientCompounds.compoundId })
      .from(ingredientCompounds)
      .where(eq(ingredientCompounds.ingredientId, id));

    const ownCompoundIds = ownCompoundRows.map((r) => r.compoundId);
    if (ownCompoundIds.length === 0) return [];

    const sourceIngredient = await db
      .select({ familyRu: ingredients.familyRu })
      .from(ingredients)
      .where(eq(ingredients.id, id))
      .limit(1);
    const sourceFamily = sourceIngredient[0]?.familyRu ?? null;

    const sharedCounts = await db
      .select({
        otherId: ingredientCompounds.ingredientId,
        sharedCount: sql<number>`count(*)`.mapWith(Number),
      })
      .from(ingredientCompounds)
      .where(
        and(
          inArray(ingredientCompounds.compoundId, ownCompoundIds),
          sql`${ingredientCompounds.ingredientId} <> ${id}`,
        ),
      )
      .groupBy(ingredientCompounds.ingredientId)
      .having(sql`count(*) >= ${minShared}`)
      .orderBy(desc(sql`count(*)`))
      .limit(500);

    const otherIds = sharedCounts.map((r) => r.otherId);
    if (otherIds.length === 0) return [];

    const otherIngs = await db
      .select({ id: ingredients.id, nameRu: ingredients.nameRu, familyRu: ingredients.familyRu })
      .from(ingredients)
      .where(inArray(ingredients.id, otherIds));

    const ingMap = new Map(otherIngs.map((i) => [i.id, { nameRu: i.nameRu, familyRu: i.familyRu }]));

    const allCandidates = sharedCounts.map((row) => ({
      otherId: row.otherId,
      sharedCount: row.sharedCount,
      nameRu: ingMap.get(row.otherId)?.nameRu ?? "—",
      familyRu: ingMap.get(row.otherId)?.familyRu ?? null,
    }));

    const familyCountMap = new Map<string, number>();
    const diverseSelection: typeof allCandidates = [];

    const differentFamily = allCandidates.filter(
      (c) => !sourceFamily || !c.familyRu || c.familyRu !== sourceFamily,
    );
    const sameFamily = allCandidates.filter(
      (c) => sourceFamily && c.familyRu && c.familyRu === sourceFamily,
    );

    for (const candidate of [...differentFamily, ...sameFamily]) {
      if (diverseSelection.length >= finalLimit) break;
      const family = candidate.familyRu ?? "__unknown__";
      const count = familyCountMap.get(family) ?? 0;
      if (count >= MAX_PER_FAMILY) continue;
      familyCountMap.set(family, count + 1);
      diverseSelection.push(candidate);
    }

    const bridges: IngredientBridge[] = [];

    for (const candidate of diverseSelection) {
      const sharedCompoundsRows = await db
        .select({ compound: aromaCompounds })
        .from(ingredientCompounds)
        .innerJoin(
          aromaCompounds,
          eq(ingredientCompounds.compoundId, aromaCompounds.id),
        )
        .where(
          and(
            eq(ingredientCompounds.ingredientId, candidate.otherId),
            inArray(ingredientCompounds.compoundId, ownCompoundIds),
          ),
        )
        .orderBy(asc(aromaCompounds.nameRu));

      bridges.push({
        fromIngredientId: id,
        toIngredientId: candidate.otherId,
        toIngredientName: candidate.nameRu,
        sharedCompoundCount: candidate.sharedCount,
        sharedCompounds: sharedCompoundsRows.map((r) => r.compound),
      });
    }

    return bridges;
  }

  async listCompounds(query?: {
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<AromaCompound[]> {
    const q = query?.q?.trim();
    const limit = clamp(query?.limit ?? 200, 1, 1000);
    const offset = clamp(query?.offset ?? 0, 0, 100000);

    return await db
      .select()
      .from(aromaCompounds)
      .where(q ? ilike(aromaCompounds.nameRu, `%${q}%`) : undefined)
      .orderBy(asc(aromaCompounds.nameRu))
      .limit(limit)
      .offset(offset);
  }

  async listTags(query?: {
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<SensoryTag[]> {
    const q = query?.q?.trim();
    const limit = clamp(query?.limit ?? 200, 1, 1000);
    const offset = clamp(query?.offset ?? 0, 0, 100000);

    return await db
      .select()
      .from(sensoryTags)
      .where(q ? ilike(sensoryTags.nameRu, `%${q}%`) : undefined)
      .orderBy(asc(sensoryTags.nameRu))
      .limit(limit)
      .offset(offset);
  }

  async listSources(): Promise<Source[]> {
    return await db.select().from(sources).orderBy(asc(sources.title));
  }

  async listFamilies(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ familyRu: ingredients.familyRu })
      .from(ingredients)
      .where(sql`${ingredients.familyRu} IS NOT NULL`)
      .orderBy(asc(ingredients.familyRu));
    return rows.map((r) => r.familyRu).filter(Boolean) as string[];
  }

  async createPairing(ingredientAId: string, ingredientBId: string, note?: string, manualStable?: boolean, manualStrength?: number): Promise<PairingWithIngredients> {
    const [ingA] = await db.select().from(ingredients).where(eq(ingredients.id, ingredientAId));
    const [ingB] = await db.select().from(ingredients).where(eq(ingredients.id, ingredientBId));

    if (!ingA || !ingB) throw new Error("Ingredient not found");

    const compoundsA = await db
      .select({ compoundId: ingredientCompounds.compoundId })
      .from(ingredientCompounds)
      .where(eq(ingredientCompounds.ingredientId, ingredientAId));

    const compoundsB = await db
      .select({ compoundId: ingredientCompounds.compoundId })
      .from(ingredientCompounds)
      .where(eq(ingredientCompounds.ingredientId, ingredientBId));

    const setA = new Set(compoundsA.map((r) => r.compoundId));
    const sharedIds = compoundsB.map((r) => r.compoundId).filter((id) => setA.has(id));

    const totalUnique = new Set([...compoundsA.map(r => r.compoundId), ...compoundsB.map(r => r.compoundId)]).size;
    const autoStrength = totalUnique > 0 ? sharedIds.length / totalUnique : 0;
    const strength = manualStrength !== undefined ? manualStrength : autoStrength;
    const isStable = manualStable !== undefined ? manualStable : strength >= 0.15;

    let sharedCompoundsList: AromaCompound[] = [];
    if (sharedIds.length > 0) {
      sharedCompoundsList = await db
        .select()
        .from(aromaCompounds)
        .where(inArray(aromaCompounds.id, sharedIds))
        .orderBy(asc(aromaCompounds.nameRu));
    }

    const [pairing] = await db
      .insert(ingredientPairings)
      .values({
        ingredientAId,
        ingredientBId,
        strength: Math.round(strength * 100) / 100,
        isStable,
        note: note || null,
      })
      .returning();

    return {
      ...pairing,
      ingredientA: ingA,
      ingredientB: ingB,
      sharedCompounds: sharedCompoundsList,
      sharedCompoundCount: sharedIds.length,
    };
  }

  async listPairings(): Promise<PairingWithIngredients[]> {
    const pairings = await db
      .select()
      .from(ingredientPairings)
      .orderBy(desc(ingredientPairings.strength));

    const results: PairingWithIngredients[] = [];

    for (const p of pairings) {
      const [ingA] = await db.select().from(ingredients).where(eq(ingredients.id, p.ingredientAId));
      const [ingB] = await db.select().from(ingredients).where(eq(ingredients.id, p.ingredientBId));

      if (!ingA || !ingB) continue;

      const compoundsA = await db
        .select({ compoundId: ingredientCompounds.compoundId })
        .from(ingredientCompounds)
        .where(eq(ingredientCompounds.ingredientId, p.ingredientAId));

      const compoundsB = await db
        .select({ compoundId: ingredientCompounds.compoundId })
        .from(ingredientCompounds)
        .where(eq(ingredientCompounds.ingredientId, p.ingredientBId));

      const setA = new Set(compoundsA.map((r) => r.compoundId));
      const sharedIds = compoundsB.map((r) => r.compoundId).filter((id) => setA.has(id));

      let sharedCompoundsList: AromaCompound[] = [];
      if (sharedIds.length > 0) {
        sharedCompoundsList = await db
          .select()
          .from(aromaCompounds)
          .where(inArray(aromaCompounds.id, sharedIds))
          .orderBy(asc(aromaCompounds.nameRu));
      }

      results.push({
        ...p,
        ingredientA: ingA,
        ingredientB: ingB,
        sharedCompounds: sharedCompoundsList,
        sharedCompoundCount: sharedIds.length,
      });
    }

    return results;
  }

  async deletePairing(id: string): Promise<boolean> {
    const result = await db
      .delete(ingredientPairings)
      .where(eq(ingredientPairings.id, id))
      .returning();
    return result.length > 0;
  }

  async checkFlavorPairings(ingredientIds: string[]): Promise<FlavorPairingResult[]> {
    if (ingredientIds.length < 2) return [];

    const conditions = [];
    for (let i = 0; i < ingredientIds.length; i++) {
      for (let j = i + 1; j < ingredientIds.length; j++) {
        conditions.push(
          and(
            eq(ingredientPairings.ingredientAId, ingredientIds[i]),
            eq(ingredientPairings.ingredientBId, ingredientIds[j]),
          ),
        );
        conditions.push(
          and(
            eq(ingredientPairings.ingredientAId, ingredientIds[j]),
            eq(ingredientPairings.ingredientBId, ingredientIds[i]),
          ),
        );
      }
    }

    const pairings = await db
      .select()
      .from(ingredientPairings)
      .where(sql`(${sql.join(conditions.map(c => sql`(${c})`), sql` OR `)})`)
      .orderBy(desc(ingredientPairings.strength));

    const ingMap = new Map<string, Ingredient>();
    if (ingredientIds.length > 0) {
      const ings = await db.select().from(ingredients).where(inArray(ingredients.id, ingredientIds));
      for (const ing of ings) ingMap.set(ing.id, ing);
    }

    const results: FlavorPairingResult[] = [];
    for (const p of pairings) {
      const ingA = ingMap.get(p.ingredientAId);
      const ingB = ingMap.get(p.ingredientBId);
      if (!ingA || !ingB) continue;

      const compoundsA = await db
        .select({ compoundId: ingredientCompounds.compoundId })
        .from(ingredientCompounds)
        .where(eq(ingredientCompounds.ingredientId, p.ingredientAId));
      const compoundsB = await db
        .select({ compoundId: ingredientCompounds.compoundId })
        .from(ingredientCompounds)
        .where(eq(ingredientCompounds.ingredientId, p.ingredientBId));

      const setA = new Set(compoundsA.map((r) => r.compoundId));
      const sharedIds = compoundsB.map((r) => r.compoundId).filter((id) => setA.has(id));

      let sharedCompoundsList: AromaCompound[] = [];
      if (sharedIds.length > 0) {
        sharedCompoundsList = await db
          .select()
          .from(aromaCompounds)
          .where(inArray(aromaCompounds.id, sharedIds))
          .orderBy(asc(aromaCompounds.nameRu));
      }

      results.push({
        ingredientAId: p.ingredientAId,
        ingredientBId: p.ingredientBId,
        ingredientAName: ingA.nameRu,
        ingredientBName: ingB.nameRu,
        strength: p.strength,
        isStable: p.isStable,
        note: p.note,
        category: p.category,
        sharedCompounds: sharedCompoundsList,
        sharedCompoundCount: sharedIds.length,
      });
    }

    return results;
  }

  async createIngredient(data: CreateIngredientRequest): Promise<Ingredient> {
    const [row] = await db.insert(ingredients).values(data).returning();
    return row;
  }

  async updateIngredient(id: string, data: UpdateIngredientRequest): Promise<Ingredient | undefined> {
    const [row] = await db.update(ingredients).set(data).where(eq(ingredients.id, id)).returning();
    return row;
  }

  async deleteIngredient(id: string): Promise<boolean> {
    const result = await db.delete(ingredients).where(eq(ingredients.id, id)).returning();
    return result.length > 0;
  }

  async createCompound(data: CreateAromaCompoundRequest): Promise<AromaCompound> {
    const [row] = await db.insert(aromaCompounds).values(data).returning();
    return row;
  }

  async createTag(data: CreateSensoryTagRequest): Promise<SensoryTag> {
    const [row] = await db.insert(sensoryTags).values(data).returning();
    return row;
  }

  async createSource(data: CreateSourceRequest): Promise<Source> {
    const [row] = await db.insert(sources).values(data).returning();
    return row;
  }

  async listCuisineTags(): Promise<(CuisineTag & { ingredientCount: number })[]> {
    const rows = await db
      .select({
        id: cuisineTags.id,
        nameRu: cuisineTags.nameRu,
        nameEn: cuisineTags.nameEn,
        emoji: cuisineTags.emoji,
        ingredientCount: sql<number>`(SELECT count(*) FROM ingredient_cuisine_tags WHERE cuisine_tag_id = ${cuisineTags.id})`.mapWith(Number),
      })
      .from(cuisineTags)
      .orderBy(asc(cuisineTags.nameRu));
    return rows;
  }

  async createCuisineTag(data: CreateCuisineTagRequest): Promise<CuisineTag> {
    const [row] = await db.insert(cuisineTags).values(data).returning();
    return row;
  }

  async getCuisineGraph(cuisineTagIds?: string[]): Promise<{
    nodes: Array<{ id: string; nameRu: string; familyRu: string | null }>;
    links: Array<{ source: string; target: string; strength: number; category: string | null; note: string | null }>;
  }> {
    let ingredientIds: string[] | null = null;

    if (cuisineTagIds && cuisineTagIds.length > 0) {
      const rows = await db
        .select({ ingredientId: ingredientCuisineTags.ingredientId })
        .from(ingredientCuisineTags)
        .where(inArray(ingredientCuisineTags.cuisineTagId, cuisineTagIds));
      ingredientIds = Array.from(new Set(rows.map((r) => r.ingredientId)));
      if (ingredientIds.length === 0) return { nodes: [], links: [] };
    }

    const pairings = ingredientIds
      ? await db
          .select()
          .from(ingredientPairings)
          .where(
            and(
              inArray(ingredientPairings.ingredientAId, ingredientIds),
              inArray(ingredientPairings.ingredientBId, ingredientIds),
            )
          )
          .orderBy(desc(ingredientPairings.strength))
      : await db
          .select()
          .from(ingredientPairings)
          .orderBy(desc(ingredientPairings.strength));

    const nodeIdSet = new Set<string>();
    for (const p of pairings) {
      nodeIdSet.add(p.ingredientAId);
      nodeIdSet.add(p.ingredientBId);
    }

    if (nodeIdSet.size === 0) return { nodes: [], links: [] };

    const nodeIds = Array.from(nodeIdSet);
    const ings = await db
      .select({ id: ingredients.id, nameRu: ingredients.nameRu, familyRu: ingredients.familyRu })
      .from(ingredients)
      .where(inArray(ingredients.id, nodeIds))
      .orderBy(asc(ingredients.nameRu));

    const links = pairings.map((p) => ({
      source: p.ingredientAId,
      target: p.ingredientBId,
      strength: p.strength,
      category: p.category,
      note: p.note,
    }));

    return { nodes: ings, links };
  }

  async getPairingGraph(): Promise<{
    nodes: Array<{ id: string; nameRu: string; familyRu: string | null }>;
    links: Array<{ source: string; target: string; strength: number; category: string | null; note: string | null }>;
  }> {
    const ings = await db
      .select({ id: ingredients.id, nameRu: ingredients.nameRu, familyRu: ingredients.familyRu })
      .from(ingredients)
      .orderBy(asc(ingredients.nameRu));

    return { nodes: ings, links: [] };
  }

  async getIngredientPairings(ingredientId: string): Promise<Array<{
    pairing: IngredientPairing;
    partner: Ingredient;
  }>> {
    const pairingsAsA = await db
      .select()
      .from(ingredientPairings)
      .where(eq(ingredientPairings.ingredientAId, ingredientId))
      .orderBy(desc(ingredientPairings.strength));

    const pairingsAsB = await db
      .select()
      .from(ingredientPairings)
      .where(eq(ingredientPairings.ingredientBId, ingredientId))
      .orderBy(desc(ingredientPairings.strength));

    const results: Array<{ pairing: IngredientPairing; partner: Ingredient }> = [];

    for (const p of pairingsAsA) {
      const [partner] = await db.select().from(ingredients).where(eq(ingredients.id, p.ingredientBId));
      if (partner) results.push({ pairing: p, partner });
    }

    for (const p of pairingsAsB) {
      const [partner] = await db.select().from(ingredients).where(eq(ingredients.id, p.ingredientAId));
      if (partner) results.push({ pairing: p, partner });
    }

    results.sort((a, b) => b.pairing.strength - a.pairing.strength);
    return results;
  }

  async listUserSavedPairings(userId: string): Promise<Array<{
    saved: UserSavedPairing;
    pairing: IngredientPairing;
    ingredientA: Ingredient;
    ingredientB: Ingredient;
  }>> {
    const saved = await db
      .select()
      .from(userSavedPairings)
      .where(eq(userSavedPairings.userId, userId))
      .orderBy(desc(userSavedPairings.savedAt));

    const results: Array<{
      saved: UserSavedPairing;
      pairing: IngredientPairing;
      ingredientA: Ingredient;
      ingredientB: Ingredient;
    }> = [];

    for (const s of saved) {
      const [pairing] = await db.select().from(ingredientPairings).where(eq(ingredientPairings.id, s.pairingId));
      if (!pairing) continue;
      const [ingA] = await db.select().from(ingredients).where(eq(ingredients.id, pairing.ingredientAId));
      const [ingB] = await db.select().from(ingredients).where(eq(ingredients.id, pairing.ingredientBId));
      if (!ingA || !ingB) continue;
      results.push({ saved: s, pairing, ingredientA: ingA, ingredientB: ingB });
    }

    return results;
  }

  async saveUserPairing(userId: string, pairingId: string): Promise<UserSavedPairing> {
    const existing = await db
      .select()
      .from(userSavedPairings)
      .where(and(eq(userSavedPairings.userId, userId), eq(userSavedPairings.pairingId, pairingId)));

    if (existing.length > 0) return existing[0];

    const [row] = await db
      .insert(userSavedPairings)
      .values({ userId, pairingId })
      .returning();
    return row;
  }

  async deleteUserSavedPairing(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(userSavedPairings)
      .where(and(eq(userSavedPairings.id, id), eq(userSavedPairings.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async isUserPairingSaved(userId: string, pairingId: string): Promise<boolean> {
    const rows = await db
      .select()
      .from(userSavedPairings)
      .where(and(eq(userSavedPairings.userId, userId), eq(userSavedPairings.pairingId, pairingId)));
    return rows.length > 0;
  }

  async getCompatibilityMatrix(ingredientIds: string[]): Promise<{
    ingredients: Array<{ id: string; nameRu: string; familyRu: string | null }>;
    pairs: Array<{
      ingredientAId: string;
      ingredientBId: string;
      strength: number;
      source: 'database' | 'compounds' | 'recipes' | 'none';
      sharedCompoundCount: number;
      note: string | null;
      category: string | null;
      recipeCooccurrenceCount: number;
      recipeStrengthBonus: number;
    }>;
    overallScore: number;
  }> {
    if (ingredientIds.length < 2) {
      const ings = ingredientIds.length > 0
        ? await db.select({ id: ingredients.id, nameRu: ingredients.nameRu, familyRu: ingredients.familyRu })
            .from(ingredients).where(inArray(ingredients.id, ingredientIds))
        : [];
      return { ingredients: ings, pairs: [], overallScore: 0 };
    }

    const ings = await db
      .select({ id: ingredients.id, nameRu: ingredients.nameRu, familyRu: ingredients.familyRu })
      .from(ingredients)
      .where(inArray(ingredients.id, ingredientIds));

    const compoundsByIngredient = new Map<string, Set<string>>();
    for (const ing of ings) {
      const rows = await db
        .select({ compoundId: ingredientCompounds.compoundId })
        .from(ingredientCompounds)
        .where(eq(ingredientCompounds.ingredientId, ing.id));
      compoundsByIngredient.set(ing.id, new Set(rows.map((r) => r.compoundId)));
    }

    // Helper: normalize ё→е for recipe name matching
    const normalizeYo = (s: string) => s.replace(/ё/gi, 'е').replace(/Ё/g, 'Е');

    // Get co-occurrence counts from recipes DB for a pair of ingredient names
    const getRecipeCooccurrence = async (nameA: string, nameB: string): Promise<number> => {
      // First try pre-computed cooccurrence table (fast)
      const { rows: cached } = await pool.query<{ count: number }>(
        `SELECT count FROM ingredient_cooccurrence
         WHERE (ingredient_a = $1 AND ingredient_b = $2)
            OR (ingredient_a = $2 AND ingredient_b = $1)
         LIMIT 1`,
        [nameA, nameB]
      );
      if (cached.length > 0) return Number(cached[0].count);
      // Fallback: live recipe search with ё normalization
      const nA = normalizeYo(nameA); const nB = normalizeYo(nameB);
      const { rows: live } = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM recipes
         WHERE (ingredients_raw ILIKE $1 OR ingredients_raw ILIKE $3)
           AND (ingredients_raw ILIKE $2 OR ingredients_raw ILIKE $4)`,
        [`%${nameA}%`, `%${nameB}%`, `%${nA}%`, `%${nB}%`]
      );
      return Number(live[0]?.count ?? 0);
    };

    // Convert raw recipe count to a normalized bonus score [0..0.3]
    // Uses log scale so common pairs (flour+egg=35k) don't dominate
    const recipeCountToBonus = (count: number): number => {
      if (count <= 0) return 0;
      // log10(35875) ≈ 4.55 — cap at this to normalize
      const maxLog = Math.log10(36000);
      return Math.min(0.3, (Math.log10(count) / maxLog) * 0.3);
    };

    const pairs: Array<{
      ingredientAId: string;
      ingredientBId: string;
      strength: number;
      source: 'database' | 'compounds' | 'recipes' | 'none';
      sharedCompoundCount: number;
      note: string | null;
      category: string | null;
      recipeCooccurrenceCount: number;
      recipeStrengthBonus: number;
    }> = [];

    for (let i = 0; i < ings.length; i++) {
      for (let j = i + 1; j < ings.length; j++) {
        const a = ings[i];
        const b = ings[j];

        const existingPairing = await db
          .select()
          .from(ingredientPairings)
          .where(
            or(
              and(eq(ingredientPairings.ingredientAId, a.id), eq(ingredientPairings.ingredientBId, b.id)),
              and(eq(ingredientPairings.ingredientAId, b.id), eq(ingredientPairings.ingredientBId, a.id)),
            )
          )
          .limit(1);

        const setA = compoundsByIngredient.get(a.id) ?? new Set();
        const setB = compoundsByIngredient.get(b.id) ?? new Set();
        const shared = [...setA].filter((c) => setB.has(c)).length;

        const recipeCount = await getRecipeCooccurrence(a.nameRu, b.nameRu);
        const recipeBonus = recipeCountToBonus(recipeCount);

        if (existingPairing.length > 0) {
          const p = existingPairing[0];
          const baseStrength = Number(p.strength) ?? 0.6;
          pairs.push({
            ingredientAId: a.id,
            ingredientBId: b.id,
            strength: Math.min(1, baseStrength + recipeBonus * 0.3),
            source: 'database',
            sharedCompoundCount: shared,
            note: p.note ?? null,
            category: p.category ?? null,
            recipeCooccurrenceCount: recipeCount,
            recipeStrengthBonus: recipeBonus,
          });
        } else {
          let strength = 0;
          let source: 'compounds' | 'recipes' | 'none' = 'none';
          if (shared >= 5) { strength = 0.9; source = 'compounds'; }
          else if (shared >= 3) { strength = 0.6; source = 'compounds'; }
          else if (shared >= 1) { strength = 0.3; source = 'compounds'; }

          // If no compound overlap but recipes confirm pairing — use recipe signal
          if (source === 'none' && recipeCount >= 50) {
            strength = recipeBonus;
            source = 'recipes';
          } else if (source !== 'none') {
            // Boost compound-derived score with recipe confirmation
            strength = Math.min(1, strength + recipeBonus * 0.2);
          }

          pairs.push({
            ingredientAId: a.id,
            ingredientBId: b.id,
            strength,
            source,
            sharedCompoundCount: shared,
            note: null,
            category: null,
            recipeCooccurrenceCount: recipeCount,
            recipeStrengthBonus: recipeBonus,
          });
        }
      }
    }

    const overallScore = pairs.length > 0
      ? pairs.reduce((sum, p) => sum + p.strength, 0) / pairs.length
      : 0;

    return { ingredients: ings, pairs, overallScore };
  }

  async seedIfEmpty(): Promise<void> {
    const existing = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(ingredients);

    const ingredientCount = existing[0]?.count ?? 0;

    if (ingredientCount > 0) {
      const pairingCount = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(ingredientPairings);

      if ((pairingCount[0]?.count ?? 0) === 0) {
        await this.seedFlavorPairings();
      }
      return;
    }

    await db.delete(ingredientCompounds);
    await db.delete(ingredientTags);
    await db.delete(ingredientPairings);
    await db.delete(ingredients);
    await db.delete(aromaCompounds);
    await db.delete(sensoryTags);
    await db.delete(sources);

    const [srcFenaroli] = await db
      .insert(sources)
      .values({
        title: "Fenaroli's Handbook of Flavor Ingredients",
        url: "https://www.routledge.com/Fenarolis-Handbook-of-Flavor-Ingredients/Burdock/p/book/9781439847503",
      })
      .returning();

    const [srcPubChem] = await db
      .insert(sources)
      .values({
        title: "PubChem",
        url: "https://pubchem.ncbi.nlm.nih.gov/",
      })
      .returning();

    const baseTags = [
      "фруктовый", "ягодный", "цитрусовый", "цветочный", "травяной", "пряный",
      "карамельный", "сливочный", "ореховый", "землистый", "дымный", "ванильный",
      "шоколадный", "кислый", "свежий", "морской", "умами", "сладкий", "жареный",
      "ароматный", "минтовый", "анисовый", "жирный", "хлебный", "дрожжевой",
    ];

    const tagRows = await db
      .insert(sensoryTags)
      .values(baseTags.map((nameRu) => ({ nameRu })))
      .returning();

    const tagByName = new Map(tagRows.map((t) => [t.nameRu, t]));

    const compoundRows = await db
      .insert(aromaCompounds)
      .values(
        expandedCompounds.map((c) => ({
          nameRu: c.nameRu,
          nameEn: c.nameEn,
          pubchemCid: c.pubchemCid,
        })),
      )
      .returning();

    const compoundByName = new Map(compoundRows.map((c) => [c.nameRu, c]));

    const ingredientsSeed: Array<{
      nameRu: string;
      familyRu: string;
      descriptionRu: string;
      tags: string[];
      keyCompounds: string[];
      otherCompounds: string[];
      isAlcohol?: boolean;
    }> = [];

    const seenNames = new Set<string>();

    for (const [family, items] of Object.entries(ingredientDatabase)) {
      for (const item of items) {
        if (seenNames.has(item.name)) continue;
        seenNames.add(item.name);

        ingredientsSeed.push({
          nameRu: item.name,
          familyRu: family,
          descriptionRu: `${family.charAt(0).toUpperCase() + family.slice(1)}: ${item.name}`,
          tags: item.tags,
          keyCompounds: item.keyCompounds,
          otherCompounds: item.otherCompounds,
          isAlcohol: family === "напитки" && (
            item.name.includes("вино") || item.name.includes("пиво") ||
            item.name.includes("виски") || item.name.includes("коньяк") ||
            item.name.includes("ром") || item.name.includes("джин") ||
            item.name.includes("водка") || item.name.includes("текила") ||
            item.name.includes("саке")
          )
        });
      }
    }

    const ingredientRows = await db
      .insert(ingredients)
      .values(
        ingredientsSeed.map((i) => ({
          nameRu: i.nameRu,
          nameEn: null,
          descriptionRu: i.descriptionRu,
          familyRu: i.familyRu,
          isAlcohol: i.isAlcohol ?? false,
          sourceId: srcFenaroli.id,
        })),
      )
      .returning();

    const ingredientByName = new Map(ingredientRows.map((i) => [i.nameRu, i]));

    const compoundLinks: Array<{
      ingredientId: string;
      compoundId: string;
      isKey: boolean;
      evidence?: string;
    }> = [];

    const tagLinks: Array<{ ingredientId: string; tagId: string }> = [];

    for (const ing of ingredientsSeed) {
      const ingRow = ingredientByName.get(ing.nameRu);
      if (!ingRow) continue;

      for (const tagName of ing.tags) {
        const tag = tagByName.get(tagName);
        if (tag) tagLinks.push({ ingredientId: ingRow.id, tagId: tag.id });
      }

      const all = [
        ...ing.keyCompounds.map((c) => ({ name: c, isKey: true })),
        ...ing.otherCompounds.map((c) => ({ name: c, isKey: false })),
      ];

      for (const c of all) {
        const comp = compoundByName.get(c.name);
        if (!comp) continue;
        compoundLinks.push({
          ingredientId: ingRow.id,
          compoundId: comp.id,
          isKey: c.isKey,
          evidence: srcPubChem.title,
        });
      }
    }

    const seenTagLinks = new Set<string>();
    const uniqueTagLinks: Array<{ ingredientId: string; tagId: string }> = [];

    for (const link of tagLinks) {
      const key = `${link.ingredientId}:${link.tagId}`;
      if (!seenTagLinks.has(key)) {
        seenTagLinks.add(key);
        uniqueTagLinks.push(link);
      }
    }

    if (uniqueTagLinks.length) {
      await db.insert(ingredientTags).values(uniqueTagLinks);
    }

    const seenCompoundLinks = new Set<string>();
    const uniqueCompoundLinks: Array<{
      ingredientId: string;
      compoundId: string;
      isKey: boolean;
      evidence?: string;
    }> = [];

    for (const link of compoundLinks) {
      const key = `${link.ingredientId}:${link.compoundId}`;
      if (!seenCompoundLinks.has(key)) {
        seenCompoundLinks.add(key);
        uniqueCompoundLinks.push(link);
      }
    }

    if (uniqueCompoundLinks.length) {
      await db.insert(ingredientCompounds).values(uniqueCompoundLinks);
    }

    await this.seedFlavorPairings();
  }

  private async seedFlavorPairings(): Promise<void> {
    const missingIngredients = [
      { nameRu: "Шоколад", familyRu: "сладости", descriptionRu: "Сладости: Шоколад" },
      { nameRu: "Ваниль", familyRu: "специи", descriptionRu: "Специя: Ваниль" },
      { nameRu: "Корица", familyRu: "специи", descriptionRu: "Специя: Корица" },
      { nameRu: "Мёд", familyRu: "сладости", descriptionRu: "Сладости: Мёд" },
      { nameRu: "Моцарелла", familyRu: "молочные продукты", descriptionRu: "Молочный продукт: Моцарелла" },
      { nameRu: "Козий сыр", familyRu: "молочные продукты", descriptionRu: "Молочный продукт: Козий сыр" },
      { nameRu: "Грибы", familyRu: "грибы", descriptionRu: "Грибы: общая категория" },
      { nameRu: "Розмарин", familyRu: "травы", descriptionRu: "Трава: Розмарин" },
      { nameRu: "Тимьян", familyRu: "травы", descriptionRu: "Трава: Тимьян" },
      { nameRu: "Кардамон", familyRu: "специи", descriptionRu: "Специя: Кардамон" },
      { nameRu: "Гвоздика", familyRu: "специи", descriptionRu: "Специя: Гвоздика" },
      { nameRu: "Вишня", familyRu: "ягоды", descriptionRu: "Ягода: Вишня" },
      { nameRu: "Перец чёрный", familyRu: "специи", descriptionRu: "Специя: Перец чёрный" },
      { nameRu: "Перец чили", familyRu: "специи", descriptionRu: "Специя: Перец чили" },
      { nameRu: "Свёкла", familyRu: "овощи", descriptionRu: "Овощ: Свёкла" },
      { nameRu: "Капуста", familyRu: "овощи", descriptionRu: "Овощ: Капуста" },
      { nameRu: "Лаванда", familyRu: "травы", descriptionRu: "Трава: Лаванда" },
      { nameRu: "Сыр (пармезан)", familyRu: "молочные продукты", descriptionRu: "Молочный продукт: Пармезан" },
      { nameRu: "Кориандр", familyRu: "специи", descriptionRu: "Специя: Кориандр" },
      { nameRu: "Куркума", familyRu: "специи", descriptionRu: "Специя: Куркума" },
      { nameRu: "Мускатный орех", familyRu: "специи", descriptionRu: "Специя: Мускатный орех" },
      { nameRu: "Паста", familyRu: "зерновые", descriptionRu: "Зерновой продукт: Паста" },
      { nameRu: "Оливковое масло", familyRu: "масла", descriptionRu: "Масло: Оливковое масло" },
      { nameRu: "Чай зелёный", familyRu: "напитки", descriptionRu: "Напиток: Чай зелёный" },
      { nameRu: "Креветки", familyRu: "рыба и морепродукты", descriptionRu: "Морепродукт: Креветки" },
    ];

    const allIngredients = await db.select().from(ingredients);
    const ingredientByName = new Map(allIngredients.map((i) => [i.nameRu, i]));

    for (const mi of missingIngredients) {
      if (!ingredientByName.has(mi.nameRu)) {
        const [created] = await db.insert(ingredients).values({
          nameRu: mi.nameRu,
          familyRu: mi.familyRu,
          descriptionRu: mi.descriptionRu,
          isAlcohol: false,
        }).returning();
        if (created) ingredientByName.set(created.nameRu, created);
      }
    }

    const flavorPairingSeed: Array<{
      a: string;
      b: string;
      strength: number;
      category: string;
      note: string;
    }> = [
      { a: "Банан", b: "Шоколад", strength: 0.95, category: "классика", note: "Сладкая классика: банан и шоколад дополняют друг друга благодаря карамельным и ванильным нотам" },
      { a: "Клубника", b: "Сливки", strength: 0.92, category: "классика", note: "Ягодная свежесть со сливочной нежностью — безупречное сочетание" },
      { a: "Яблоко", b: "Корица", strength: 0.94, category: "классика", note: "Классическое осеннее сочетание с теплыми пряными нотами" },
      { a: "Лимон", b: "Имбирь", strength: 0.88, category: "классика", note: "Яркий цитрусовый + жгучая пряность — освежающий тандем" },
      { a: "Апельсин", b: "Шоколад", strength: 0.90, category: "классика", note: "Горький шоколад с цитрусовой кислинкой — гармоничный контраст" },
      { a: "Малина", b: "Шоколад", strength: 0.88, category: "классика", note: "Ягодная кислинка прекрасно оттеняет насыщенность шоколада" },
      { a: "Персик", b: "Ваниль", strength: 0.86, category: "классика", note: "Нежные фруктовые ноты с ванильной сладостью" },
      { a: "Груша", b: "Сыр (пармезан)", strength: 0.85, category: "классика", note: "Европейская классика: сладкая груша и солоноватый пармезан" },
      { a: "Манго", b: "Кокос", strength: 0.91, category: "классика", note: "Тропическая пара с богатым вкусовым профилем" },
      { a: "Ананас", b: "Кокос", strength: 0.89, category: "классика", note: "Тропическая свежесть с кремовой основой" },
      { a: "Вишня", b: "Миндаль", strength: 0.87, category: "классика", note: "Общий бензальдегид создаёт глубокий ароматический мост" },
      { a: "Черника", b: "Лимон", strength: 0.84, category: "классика", note: "Ягодная сладость с цитрусовой свежестью" },
      { a: "Клубника", b: "Банан", strength: 0.86, category: "классика", note: "Два фрукта с комплементарными эфирными профилями" },
      { a: "Клубника", b: "Шоколад", strength: 0.91, category: "классика", note: "Романтическое сочетание: сочная ягода в шоколадной глазури" },
      { a: "Мёд", b: "Грецкий орех", strength: 0.90, category: "классика", note: "Натуральная сладость с ореховой глубиной" },
      { a: "Тыква", b: "Корица", strength: 0.88, category: "классика", note: "Осенний тёплый вкус с пряным дополнением" },
      { a: "Помидор", b: "Базилик", strength: 0.95, category: "классика", note: "Средиземноморский эталон — свежий и ароматный" },
      { a: "Помидор", b: "Моцарелла", strength: 0.93, category: "классика", note: "Основа капрезе: кислинка томата с нежной моцареллой" },
      { a: "Чеснок", b: "Розмарин", strength: 0.87, category: "классика", note: "Ароматная пара для мяса и овощей" },
      { a: "Лайм", b: "Кокос", strength: 0.88, category: "классика", note: "Тропический дуэт с кислинкой и сладостью" },
      { a: "Абрикос", b: "Миндаль", strength: 0.85, category: "классика", note: "Родственные ароматы: косточковый плод и орех делят бензальдегид" },
      { a: "Инжир", b: "Мёд", strength: 0.86, category: "классика", note: "Два натуральных сахаристых ингредиента с глубоким профилем" },
      { a: "Свёкла", b: "Козий сыр", strength: 0.84, category: "классика", note: "Землистая сладость свёклы с кислинкой козьего сыра" },
      { a: "Морковь", b: "Имбирь", strength: 0.82, category: "классика", note: "Сладость корнеплода с пряным жаром имбиря" },
      { a: "Авокадо", b: "Лайм", strength: 0.89, category: "классика", note: "Основа гуакамоле: маслянистый авокадо с кислым лаймом" },
      { a: "Чеснок", b: "Петрушка", strength: 0.85, category: "классика", note: "Базовая зелёная пара для европейской кухни" },
      { a: "Укроп", b: "Огурец", strength: 0.88, category: "классика", note: "Свежая пара: огурцовая чистота с ароматным укропом" },
      { a: "Мята", b: "Шоколад", strength: 0.83, category: "классика", note: "Ментоловая свежесть с шоколадной глубиной" },
      { a: "Мята", b: "Лайм", strength: 0.86, category: "классика", note: "Освежающая комбинация для коктейлей и десертов" },
      { a: "Кардамон", b: "Кофе", strength: 0.88, category: "классика", note: "Восточная традиция: кардамон смягчает горечь кофе" },
      { a: "Корица", b: "Мёд", strength: 0.87, category: "классика", note: "Тёплая пряность с натуральной сладостью" },
      { a: "Ваниль", b: "Клубника", strength: 0.88, category: "классика", note: "Сливочная ваниль подчёркивает ягодную свежесть" },
      { a: "Ваниль", b: "Шоколад", strength: 0.92, category: "классика", note: "Базовое кондитерское сочетание: ваниль усиливает какао" },
      { a: "Гвоздика", b: "Апельсин", strength: 0.85, category: "классика", note: "Зимнее сочетание: пряная гвоздика с цитрусом" },
      { a: "Перец чёрный", b: "Клубника", strength: 0.78, category: "авангард", note: "Неожиданная пара: перечная пряность раскрывает ягодные ноты" },
      { a: "Базилик", b: "Клубника", strength: 0.80, category: "авангард", note: "Травяная свежесть придаёт ягоде глубину" },
      { a: "Розмарин", b: "Апельсин", strength: 0.82, category: "авангард", note: "Хвойная нота розмарина контрастирует с цитрусовой яркостью" },
      { a: "Тимьян", b: "Лимон", strength: 0.83, category: "авангард", note: "Травяная пряность с цитрусовой кислинкой" },
      { a: "Лаванда", b: "Мёд", strength: 0.81, category: "авангард", note: "Цветочный аромат с натуральной сладостью" },
      { a: "Свёкла", b: "Шоколад", strength: 0.76, category: "авангард", note: "Землистая сладость свёклы дополняет какао" },
      { a: "Авокадо", b: "Шоколад", strength: 0.74, category: "авангард", note: "Маслянистая текстура авокадо создаёт шоколадный мусс" },
      { a: "Морковь", b: "Кардамон", strength: 0.79, category: "авангард", note: "Индийская традиция: морковная халва с кардамоном" },
      { a: "Тыква", b: "Мускатный орех", strength: 0.85, category: "классика", note: "Тёплое сочетание для осенних блюд" },
      { a: "Капуста", b: "Яблоко", strength: 0.78, category: "классика", note: "Немецкая традиция: квашеная капуста с яблоком" },
      { a: "Картофель", b: "Розмарин", strength: 0.86, category: "классика", note: "Ароматический дуэт для запечённого картофеля" },
      { a: "Баклажан", b: "Помидор", strength: 0.87, category: "классика", note: "Средиземноморская пара для рагу и запеканок" },
      { a: "Грибы", b: "Тимьян", strength: 0.86, category: "классика", note: "Землистые грибы с травяной пряностью" },
      { a: "Грибы", b: "Чеснок", strength: 0.89, category: "классика", note: "Умами грибов усиливается чесночным ароматом" },
      { a: "Курица", b: "Лимон", strength: 0.88, category: "классика", note: "Цитрусовая кислинка оживляет мягкий вкус курицы" },
      { a: "Говядина", b: "Перец чёрный", strength: 0.90, category: "классика", note: "Классическое стейковое сочетание с пряным акцентом" },
      { a: "Лосось", b: "Укроп", strength: 0.91, category: "классика", note: "Скандинавская традиция: рыба с ароматной зеленью" },
      { a: "Лосось", b: "Лимон", strength: 0.89, category: "классика", note: "Цитрусовая кислинка раскрывает вкус рыбы" },
      { a: "Креветки", b: "Чеснок", strength: 0.90, category: "классика", note: "Средиземноморская пара для блюд из морепродуктов" },
      { a: "Рис", b: "Кунжут", strength: 0.82, category: "классика", note: "Азиатская основа с ореховым ароматом" },
      { a: "Паста", b: "Базилик", strength: 0.88, category: "классика", note: "Итальянская классика: тёплая паста с ароматным базиликом" },
      { a: "Козий сыр", b: "Мёд", strength: 0.85, category: "классика", note: "Кислинка сыра с натуральной сладостью мёда" },
      { a: "Масло сливочное", b: "Чеснок", strength: 0.87, category: "классика", note: "Чесночное масло — основа многих европейских блюд" },
      { a: "Оливковое масло", b: "Лимон", strength: 0.84, category: "классика", note: "Средиземноморский дуэт для салатов и рыбы" },
      { a: "Маракуйя", b: "Манго", strength: 0.87, category: "классика", note: "Тропический букет с кислинкой и сладостью" },
      { a: "Грейпфрут", b: "Розмарин", strength: 0.77, category: "авангард", note: "Горьковатый цитрус с хвойной пряностью" },
      { a: "Дыня", b: "Мята", strength: 0.83, category: "классика", note: "Освежающее летнее сочетание" },
      { a: "Арбуз", b: "Мята", strength: 0.81, category: "классика", note: "Лёгкое и освежающее летнее сочетание" },
      { a: "Киви", b: "Клубника", strength: 0.82, category: "классика", note: "Кислинка киви с ягодной сладостью клубники" },
      { a: "Слива", b: "Корица", strength: 0.80, category: "классика", note: "Косточковый плод с тёплой пряностью" },
      { a: "Черешня", b: "Ваниль", strength: 0.82, category: "классика", note: "Сладкая черешня с ванильной глубиной" },
      { a: "Гранат", b: "Грецкий орех", strength: 0.83, category: "классика", note: "Кавказская традиция: кислый гранат с ореховой сладостью" },
      { a: "Лайм", b: "Кориандр", strength: 0.84, category: "классика", note: "Основа мексиканской и азиатской кухни" },
      { a: "Имбирь", b: "Чеснок", strength: 0.85, category: "классика", note: "Азиатская база: два мощных ароматических корня" },
      { a: "Куркума", b: "Перец чёрный", strength: 0.83, category: "классика", note: "Пиперин усиливает усвоение куркумина в 20 раз" },
      { a: "Мускатный орех", b: "Шпинат", strength: 0.80, category: "классика", note: "Французская классика: мускат раскрывает вкус шпината" },
      { a: "Перец чили", b: "Шоколад", strength: 0.82, category: "авангард", note: "Мексиканская традиция моле: жгучий перец с какао" },
      { a: "Перец чили", b: "Манго", strength: 0.80, category: "авангард", note: "Тропическая сладость с острым контрастом" },
      { a: "Кофе", b: "Шоколад", strength: 0.93, category: "классика", note: "Два продукта из тропических бобов с родственным ароматом" },
      { a: "Чай зелёный", b: "Мята", strength: 0.84, category: "классика", note: "Марокканская традиция: зелёный чай с мятой" },
      { a: "Фундук", b: "Шоколад", strength: 0.91, category: "классика", note: "Ореховая сладость с какао — основа пралине" },
      { a: "Кешью", b: "Кокос", strength: 0.83, category: "классика", note: "Кремовые орехи с тропическим кокосом" },
      { a: "Фисташка", b: "Малина", strength: 0.79, category: "авангард", note: "Нежные ореховые ноты с ягодной кислинкой" },
      { a: "Кунжут", b: "Имбирь", strength: 0.82, category: "классика", note: "Азиатская пара для маринадов и соусов" },
    ];

    const pairingValues: Array<{
      ingredientAId: string;
      ingredientBId: string;
      strength: number;
      isStable: boolean;
      note: string | null;
      category: string | null;
    }> = [];

    for (const fp of flavorPairingSeed) {
      const ingA = ingredientByName.get(fp.a);
      const ingB = ingredientByName.get(fp.b);
      if (ingA && ingB) {
        pairingValues.push({
          ingredientAId: ingA.id,
          ingredientBId: ingB.id,
          strength: fp.strength,
          isStable: fp.strength >= 0.8,
          note: fp.note,
          category: fp.category,
        });
      }
    }

    if (pairingValues.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < pairingValues.length; i += batchSize) {
        await db.insert(ingredientPairings).values(pairingValues.slice(i, i + batchSize));
      }
    }
  }
}

export const storage = new DatabaseStorage();
