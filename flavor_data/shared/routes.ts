import { z } from "zod";
import {
  insertAromaCompoundSchema,
  insertIngredientSchema,
  insertSensoryTagSchema,
  insertSourceSchema,
  type AromaCompound,
  type Ingredient,
  type IngredientBridge,
  type IngredientDetail,
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
    get: {
      method: "GET" as const,
      path: "/api/compounds/:id",
      responses: {
        200: compoundSchema,
        404: errorSchemas.notFound,
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
  graph: {
    overview: {
      method: "GET" as const,
      path: "/api/graph",
      input: z
        .object({
          ingredientId: z.string().optional(),
          limitNodes: z.coerce.number().int().min(10).max(1000).optional(),
          minSharedCompounds: z.coerce.number().int().min(1).max(20).optional(),
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
              sharedCompoundCount: z.number().int(),
            }),
          ),
        }),
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

export type IngredientListResponse = z.infer<typeof api.ingredients.list.responses[200]>;
export type IngredientDetailResponse = z.infer<typeof api.ingredients.get.responses[200]>;
export type IngredientBridgesResponse = z.infer<
  typeof api.ingredients.bridges.responses[200]
>;

export type CompoundsListResponse = z.infer<typeof api.compounds.list.responses[200]>;
export type TagsListResponse = z.infer<typeof api.tags.list.responses[200]>;
export type SourcesListResponse = z.infer<typeof api.sources.list.responses[200]>;

export type GraphResponse = z.infer<typeof api.graph.overview.responses[200]>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type InternalError = z.infer<typeof errorSchemas.internal>;
