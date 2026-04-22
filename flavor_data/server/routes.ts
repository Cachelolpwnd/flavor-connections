import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { api } from "@shared/routes";
import { storage } from "./storage";

function zodToValidationError(err: z.ZodError) {
  const first = err.errors[0];
  return {
    message: first?.message ?? "Ошибка валидации",
    field: first?.path?.length ? first.path.join(".") : undefined,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await storage.seedIfEmpty();

  app.get(api.ingredients.list.path, async (req, res) => {
    const input = api.ingredients.list.input?.parse(req.query);
    const items = await storage.listIngredients(input);
    res.json(items);
  });

  app.get(api.ingredients.get.path, async (req, res) => {
    const item = await storage.getIngredientDetail(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Ингредиент не найден" });
    }
    res.json(item);
  });

  app.get(api.ingredients.bridges.path, async (req, res) => {
    const input = api.ingredients.bridges.input?.parse(req.query);
    const item = await storage.getIngredientDetail(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Ингредиент не найден" });
    }

    const bridges = await storage.getIngredientBridges(req.params.id, {
      minSharedCompounds: input?.minSharedCompounds,
      limit: input?.limit,
    });

    res.json(bridges);
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

  app.get(api.sources.list.path, async (_req, res) => {
    const items = await storage.listSources();
    res.json(items);
  });

  app.get(api.graph.overview.path, async (req, res) => {
    const input = api.graph.overview.input?.parse(req.query);

    const seedIngredientId = input?.ingredientId;
    const limitNodes = input?.limitNodes ?? 120;
    const minShared = input?.minSharedCompounds ?? 2;

    const baseList = await storage.listIngredients({ limit: limitNodes });

    const nodes = baseList.map((i) => ({
      id: i.id,
      nameRu: i.nameRu,
      familyRu: i.familyRu,
    }));

    const idSet = new Set(nodes.map((n) => n.id));

    const links: Array<{ source: string; target: string; sharedCompoundCount: number }> = [];

    const focusId = seedIngredientId && idSet.has(seedIngredientId) ? seedIngredientId : nodes[0]?.id;

    if (focusId) {
      const bridges = await storage.getIngredientBridges(focusId, {
        minSharedCompounds: minShared,
        limit: 200,
      });

      for (const b of bridges) {
        if (idSet.has(b.toIngredientId)) {
          links.push({
            source: b.fromIngredientId,
            target: b.toIngredientId,
            sharedCompoundCount: b.sharedCompoundCount,
          });
        }
      }
    }

    res.json({ nodes, links });
  });

  app.post(api.ingredients.create.path, async (req, res) => {
    try {
      const input = api.ingredients.create.input.parse(req.body);
      return res.status(501).json({ message: "Создание ингредиентов отключено в демо" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidationError(err));
      }
      throw err;
    }
  });

  return httpServer;
}
