import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { api } from "@shared/routes";
import { storage } from "./storage";
import { pool } from "./db";

function zodToValidationError(err: z.ZodError) {
  const first = err.errors[0];
  return {
    message: first?.message ?? "Validation error",
    field: first?.path?.length ? first.path.join(".") : undefined,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  console.log("ENV:", process.env.NODE_ENV, process.env.FORCE_SEED);
  if (
    process.env.NODE_ENV !== "production" || 
    process.env.FORCE_SEED === "true"
  ) {
  console.log("SEED RUNNING");
  await storage.seedIfEmpty();
}
}

  app.get(api.ingredients.list.path, async (req, res) => {
    const input = api.ingredients.list.input?.parse(req.query);
    const items = await storage.listIngredients(input);
    res.json(items);
  });

  app.get("/api/ingredients/:id", async (req, res) => {
    const item = await storage.getIngredientDetail(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    res.json(item);
  });

  app.get("/api/ingredients/:id/bridges", async (req, res) => {
    const input = api.ingredients.bridges.input?.parse(req.query);
    const item = await storage.getIngredientDetail(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Ingredient not found" });
    }

    const bridges = await storage.getIngredientBridges(req.params.id, {
      minSharedCompounds: input?.minSharedCompounds,
      limit: input?.limit,
    });

    res.json(bridges);
  });

  app.post(api.ingredients.create.path, async (req, res) => {
    try {
      const input = api.ingredients.create.input.parse(req.body);
      const item = await storage.createIngredient(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidationError(err));
      }
      throw err;
    }
  });

  app.put("/api/ingredients/:id", async (req, res) => {
    try {
      const input = api.ingredients.update.input.parse(req.body);
      const item = await storage.updateIngredient(req.params.id, input);
      if (!item) {
        return res.status(404).json({ message: "Ингредиент не найден" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidationError(err));
      }
      throw err;
    }
  });

  app.delete("/api/ingredients/:id", async (req, res) => {
    const deleted = await storage.deleteIngredient(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Ингредиент не найден" });
    }
    res.status(204).send();
  });

  app.get(api.compounds.list.path, async (req, res) => {
    const input = api.compounds.list.input?.parse(req.query);
    const items = await storage.listCompounds(input);
    res.json(items);
  });

  app.get(api.tags.list.path, async (req, res) => {
    const input = api.tags.list.input?.parse(req.query);
    const items = await storage.listTags(input);
    res.json(items);
  });

  app.post(api.compounds.create.path, async (req, res) => {
    try {
      const input = api.compounds.create.input.parse(req.body);
      const item = await storage.createCompound(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidationError(err));
      }
      throw err;
    }
  });

  app.post(api.tags.create.path, async (req, res) => {
    try {
      const input = api.tags.create.input.parse(req.body);
      const item = await storage.createTag(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidationError(err));
      }
      throw err;
    }
  });

  app.get(api.sources.list.path, async (_req, res) => {
    const items = await storage.listSources();
    res.json(items);
  });

  app.post(api.sources.create.path, async (req, res) => {
    try {
      const input = api.sources.create.input.parse(req.body);
      const item = await storage.createSource(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidationError(err));
      }
      throw err;
    }
  });

  app.get(api.families.list.path, async (_req, res) => {
    const items = await storage.listFamilies();
    res.json(items);
  });

  app.get(api.pairings.list.path, async (_req, res) => {
    const items = await storage.listPairings();
    res.json(items);
  });

  app.post(api.pairings.create.path, async (req, res) => {
    try {
      const input = api.pairings.create.input.parse(req.body);
      const pairing = await storage.createPairing(
        input.ingredientAId,
        input.ingredientBId,
        input.note,
        input.manualStable,
        input.manualStrength,
      );
      res.status(201).json(pairing);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidationError(err));
      }
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  });

  app.delete("/api/pairings/:id", async (req, res) => {
    const deleted = await storage.deletePairing(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Pairing not found" });
    }
    res.status(204).send();
  });

  app.get("/api/pairings/matrix", async (req, res) => {
    const raw = req.query.ids;
    const ids = Array.isArray(raw) ? raw as string[] : typeof raw === "string" ? raw.split(",").filter(Boolean) : [];
    if (ids.length < 2) {
      return res.status(400).json({ message: "Нужно минимум 2 ингредиента" });
    }
    const matrix = await storage.getCompatibilityMatrix(ids);
    res.json(matrix);
  });

  app.get("/api/recipes", async (req, res) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const ingredient = typeof req.query.ingredient === "string" ? req.query.ingredient.trim() : undefined;
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const offset = Number(req.query.offset) || 0;

    let sql = `SELECT id, url, name, category, ingredients_raw FROM recipes WHERE 1=1`;
    const params: (string | number)[] = [];
    let p = 1;

    if (category) { sql += ` AND category = $${p++}`; params.push(category); }
    if (q) { sql += ` AND name ILIKE $${p++}`; params.push(`%${q}%`); }
    if (ingredient) { sql += ` AND ingredients_raw ILIKE $${p++}`; params.push(`%${ingredient}%`); }

    const countSql = sql.replace("SELECT id, url, name, category, ingredients_raw", "SELECT COUNT(*)");
    const { rows: countRows } = await pool.query(countSql, params);
    const total = Number(countRows[0].count);

    sql += ` ORDER BY name LIMIT $${p++} OFFSET $${p++}`;
    params.push(limit, offset);

    const { rows } = await pool.query(sql, params);
    res.json({ total, items: rows });
  });

  app.get("/api/recipes/categories", async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT category, COUNT(*) as count FROM recipes GROUP BY category ORDER BY count DESC`
    );
    res.json(rows);
  });

  app.get("/api/recipes/pairs", async (req, res) => {
    const a = typeof req.query.a === "string" ? req.query.a.trim() : undefined;
    const b = typeof req.query.b === "string" ? req.query.b.trim() : undefined;
    if (!a || !b) return res.status(400).json({ message: "a and b required" });
    const normalize = (s: string) => s.replace(/ё/gi, "е").replace(/Ё/g, "Е");
    const aN = normalize(a);
    const bN = normalize(b);
    const { rows } = await pool.query(
      `SELECT id, name, category, ingredients_raw FROM recipes
       WHERE (ingredients_raw ILIKE $1 OR ingredients_raw ILIKE $3)
         AND (ingredients_raw ILIKE $2 OR ingredients_raw ILIKE $4)
       LIMIT 5`,
      [`%${a}%`, `%${b}%`, `%${aN}%`, `%${bN}%`]
    );
    res.json(rows);
  });

  app.get("/api/recipes/:id", async (req, res) => {
    const { rows } = await pool.query(`SELECT * FROM recipes WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  });

  app.get("/api/cooccurrence", async (req, res) => {
    const ingredient = typeof req.query.ingredient === "string" ? req.query.ingredient.trim() : undefined;
    if (!ingredient) return res.status(400).json({ message: "ingredient required" });
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const { rows } = await pool.query(
      `SELECT ingredient_a, ingredient_b, count FROM ingredient_cooccurrence
       WHERE ingredient_a ILIKE $1 OR ingredient_b ILIKE $1
       ORDER BY count DESC LIMIT $2`,
      [`%${ingredient}%`, limit]
    );
    res.json(rows);
  });

  app.post(api.flavorCheck.check.path, async (req, res) => {
    try {
      const input = api.flavorCheck.check.input.parse(req.body);
      const results = await storage.checkFlavorPairings(input.ingredientIds);
      res.json(results);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidationError(err));
      }
      throw err;
    }
  });

  app.get(api.cuisineTags.list.path, async (_req, res) => {
    const items = await storage.listCuisineTags();
    res.json(items);
  });

  app.post(api.cuisineTags.create.path, async (req, res) => {
    try {
      const input = api.cuisineTags.create.input.parse(req.body);
      const item = await storage.createCuisineTag(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidationError(err));
      }
      throw err;
    }
  });

  app.get(api.cuisineGraph.overview.path, async (req, res) => {
    const input = api.cuisineGraph.overview.input?.parse(req.query);
    const cuisineTagIds = input?.cuisineTagIds
      ? input.cuisineTagIds.split(",").filter(Boolean)
      : undefined;
    const result = await storage.getCuisineGraph(cuisineTagIds);
    res.json(result);
  });

  app.get(api.graph.overview.path, async (_req, res) => {
    const result = await storage.getPairingGraph();
    res.json(result);
  });

  app.get("/api/ingredients/:id/pairings", async (req, res) => {
    const pairings = await storage.getIngredientPairings(req.params.id);
    res.json(pairings);
  });

  return httpServer;
}
