import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Кожен запис — окремий JSON-файл. Женя редагує їх через адмінку (Pages CMS),
// а сайт перебудовується сам після кожного збереження.

const categories = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/categories' }),
  schema: z.object({
    name: z.string(),
    order: z.number().default(99),
  }),
});

const portfolio = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/portfolio' }),
  schema: z.object({
    title: z.string(),
    photo: z.string(),
    alt: z.string().default(''),
    categories: z.array(z.string()).default([]),
    order: z.number().default(99),
    // позиція у вкладці «Останні» (1 — перша). Порожньо — не показувати там.
    recent: z.number().optional(),
    hidden: z.boolean().default(false),
  }),
});

const albums = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/albums' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(99),
    cover: z.string(),
    coverAlt: z.string().default(''),
    photos: z.array(z.object({ photo: z.string(), alt: z.string().default('') })).default([]),
    hidden: z.boolean().default(false),
  }),
});

export const collections = { categories, portfolio, albums };
