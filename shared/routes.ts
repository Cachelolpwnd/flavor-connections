import { z } from "zod";
import {
  insertAromaCompoundSchema,
  insertCuisineTagSchema,
  insertIngredientSchema,
  insertPairingSchema,
  insertSensoryTagSchema,
  insertSourceSchema,
  type AromaCompound,
  type CuisineTag,
  type FlavorPairingResult,
  type Ingredient,
  type IngredientBridge,
  type IngredientDetail,
  type IngredientPairing,
  type PairingWithIngredients,
  type SensoryTag,
  type Source,
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const ingredientSchema = z.custom<Ingredient>();
const ingredientDetailSchema = z.custom<IngredientDetail>();
const compoundSchema = z.custom<AromaCompound>();
const tagSchema = z.custom<SensoryTag>();
const sourceSchema = z.custom<Source>();
const bridgeSchema = z.custom<IngredientBridge>();
const pairingSchema = z.custom<IngredientPairing>();
const pairingWithIngredientsSchema = z.custom<PairingWithIngredients>();
const flavorPairingResultSchema = z.custom<FlavorPairingResult>();
const cuisineTagSchema = z.custom<CuisineTag>();

export const api = {
  ingredients: {
    list: {
      method: "GET" as const,
      path: "/api/ingredients",
      input: z
        .object({
          q: z.string().optional(),
          tagId: z.string().optional(),
          compoundId: z.string().optional(),
          familyRu: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(2000).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        })
        .optional(),
      responses: {
        200: z.array(ingredientSchema),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/ingredients/:id",
      responses: {
        200: ingredientDetailSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/ingredients",
      input: insertIngredientSchema,
      responses: {
        201: ingredientSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/ingredients/:id",
      input: insertIngredientSchema.partial(),
      responses: {
        200: ingredientSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/ingredients/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    bridges: {
      method: "GET" as const,
      path: "/api/ingredients/:id/bridges",
      input: z
        .object({
          minSharedCompounds: z.coerce.number().int().min(1).max(20).optional(),
          limit: z.coerce.number().int().min(1).max(200).optional(),
        })
        .optional(),
      responses: {
        200: z.array(bridgeSchema),
        404: errorSchemas.notFound,
      },
    },
  },
  compounds: {
    list: {
      method: "GET" as const,
      path: "/api/compounds",
      input: z
        .object({
          q: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(2000).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        })
        .optional(),
      responses: {
        200: z.array(compoundSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/compounds",
      input: insertAromaCompoundSchema,
      responses: {
        201: compoundSchema,
        400: errorSchemas.validation,
      },
    },
  },
  tags: {
    list: {
      method: "GET" as const,
      path: "/api/tags",
      input: z
        .object({
          q: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(2000).optional(),
          offset: z.coerce.number().int().min(0).optional(),
        })
        .optional(),
      responses: {
        200: z.array(tagSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/tags",
      input: insertSensoryTagSchema,
      responses: {
        201: tagSchema,
        400: errorSchemas.validation,
      },
    },
  },
  sources: {
    list: {
      method: "GET" as const,
      path: "/api/sources",
      responses: {
        200: z.array(sourceSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/sources",
      input: insertSourceSchema,
      responses: {
        201: sourceSchema,
        400: errorSchemas.validation,
      },
    },
  },
  pairings: {
    list: {
      method: "GET" as const,
      path: "/api/pairings",
      responses: {
        200: z.array(pairingWithIngredientsSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/pairings",
      input: z.object({
        ingredientAId: z.string(),
        ingredientBId: z.string(),
        note: z.string().optional(),
        manualStable: z.boolean().optional(),
        manualStrength: z.number().min(0).max(1).optional(),
      }),
      responses: {
        201: pairingWithIngredientsSchema,
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/pairings/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  graph: {
    overview: {
      method: "GET" as const,
      path: "/api/graph",
      input: z
        .object({
          ingredientId: z.string().optional(),
        })
        .optional(),
      responses: {
        200: z.object({
          nodes: z.array(
            z.object({
              id: z.string(),
              nameRu: z.string(),
              familyRu: z.string().nullable().optional(),
            }),
          ),
          links: z.array(
            z.object({
              source: z.string(),
              target: z.string(),
              strength: z.number(),
              category: z.string().nullable().optional(),
              note: z.string().nullable().optional(),
            }),
          ),
        }),
      },
    },
  },
  savedPairings: {
    list: {
      method: "GET" as const,
      path: "/api/saved-pairings",
      responses: {
        200: z.array(z.any()),
      },
    },
    save: {
      method: "POST" as const,
      path: "/api/saved-pairings",
      input: z.object({
        pairingId: z.string(),
      }),
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/saved-pairings/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  ingredientPairings: {
    list: {
      method: "GET" as const,
      path: "/api/ingredients/:id/pairings",
      responses: {
        200: z.array(z.any()),
      },
    },
  },
  families: {
    list: {
      method: "GET" as const,
      path: "/api/families",
      responses: {
        200: z.array(z.string()),
      },
    },
  },
  cuisineTags: {
    list: {
      method: "GET" as const,
      path: "/api/cuisine-tags",
      responses: {
        200: z.array(cuisineTagSchema.and(z.object({ ingredientCount: z.number().optional() }))),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/cuisine-tags",
      input: insertCuisineTagSchema,
      responses: {
        201: cuisineTagSchema,
        400: errorSchemas.validation,
      },
    },
  },
  cuisineGraph: {
    overview: {
      method: "GET" as const,
      path: "/api/cuisine-graph",
      input: z
        .object({
          cuisineTagIds: z.string().optional(),
        })
        .optional(),
      responses: {
        200: z.object({
          nodes: z.array(
            z.object({
              id: z.string(),
              nameRu: z.string(),
              familyRu: z.string().nullable().optional(),
            }),
          ),
          links: z.array(
            z.object({
              source: z.string(),
              target: z.string(),
              strength: z.number(),
              category: z.string().nullable().optional(),
              note: z.string().nullable().optional(),
            }),
          ),
        }),
      },
    },
  },
  flavorCheck: {
    check: {
      method: "POST" as const,
      path: "/api/flavor-check",
      input: z.object({
        ingredientIds: z.array(z.string()).min(2).max(15),
      }),
      responses: {
        200: z.array(flavorPairingResultSchema),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, String(value));
    }
  }
  return url;
}
