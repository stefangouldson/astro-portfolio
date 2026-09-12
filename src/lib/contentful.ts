import { createClient, type Entry } from 'contentful';
import type { Document } from '@contentful/rich-text-types';

/**
 * Build-time Contentful access. Every call degrades to an empty result and a
 * warning rather than failing the build, so the site still compiles before the
 * API key is filled in.
 */

const env = (key: string): string | undefined =>
  (import.meta.env?.[key] as string | undefined) || process.env[key] || undefined;

const SPACE_ID = env('CONTENTFUL_SPACE_ID');
const ACCESS_TOKEN = env('CONTENTFUL_ACCESS_TOKEN');
const PROJECT_TYPE = env('CONTENTFUL_PROJECT_TYPE_ID') ?? 'projects';

export const isConfigured = Boolean(SPACE_ID && ACCESS_TOKEN);

let warned = false;
const warnOnce = () => {
  if (warned) return;
  warned = true;
  console.warn(
    '[contentful] CONTENTFUL_SPACE_ID / CONTENTFUL_ACCESS_TOKEN are not set — ' +
      'Projects will build as empty. Add them to .env.',
  );
};

const client = isConfigured
  ? createClient({ space: SPACE_ID!, accessToken: ACCESS_TOKEN! })
  : null;

export type CardItem = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  tags: string[];
  image?: string;
  publishedAt?: string;
  featured?: boolean;
};

export type Project = CardItem & { content: Document | null };

/** Contentful returns protocol-relative asset URLs. */
const assetUrl = (asset: any): string | undefined => {
  const url = asset?.fields?.file?.url;
  if (!url) return undefined;
  return url.startsWith('//') ? `https:${url}` : url;
};

const formatShort = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : undefined;

const toCard = (entry: Entry<any>): CardItem => {
  const fields = entry.fields as any;
  return {
    id: entry.sys.id,
    title: fields.title ?? 'Untitled',
    slug: fields.slug ?? entry.sys.id,
    description: fields.description ?? undefined,
    tags: Array.isArray(fields.tags) ? fields.tags : [],
    image: assetUrl(fields.image),
    publishedAt: formatShort(fields.publishedAt),
    featured: fields.featured ?? undefined,
  };
};

const query = async (params: Record<string, unknown>): Promise<Entry<any>[]> => {
  if (!client) {
    warnOnce();
    return [];
  }
  try {
    const response = await client.getEntries<any>(params as any);
    return response.items;
  } catch (error) {
    console.warn(
      `[contentful] query failed for ${String(params.content_type)}:`,
      error instanceof Error ? error.message : error,
    );
    return [];
  }
};

// --------------------------------------------------------------- projects

export async function getProjects(): Promise<Project[]> {
  const items = await query({
    content_type: PROJECT_TYPE,
    order: ['fields.order'],
    include: 10,
  });
  return items.map((entry) => ({
    ...toCard(entry),
    content: ((entry.fields as any).content as Document) ?? null,
  }));
}

export async function getProject(slug: string): Promise<Project | null> {
  const items = await query({
    content_type: PROJECT_TYPE,
    'fields.slug': slug,
    limit: 1,
    include: 10,
  });
  const entry = items[0];
  if (!entry) return null;
  return {
    ...toCard(entry),
    content: ((entry.fields as any).content as Document) ?? null,
  };
}
