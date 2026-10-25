import { useEffect } from 'react';
import { SITE_NAME } from '../seo/publicPages';

const DEFAULT_TITLE = SITE_NAME;

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function usePublicSeo({
  title,
  description,
  path,
  image,
  jsonLd,
  enabled = true,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  jsonLd?: Record<string, unknown> | null;
  enabled?: boolean;
}) {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    if (!enabled) return;

    const origin = window.location.origin;
    const url = `${origin}${path}`;
    const fullTitle = title.includes('|') || title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const img = image
      ? (image.startsWith('http') ? image : `${origin}${encodeURI(image)}`)
      : `${origin}/slide1.jpeg`;

    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', 'index,follow');
    upsertMeta('name', 'geo.region', 'IN-CG');
    upsertMeta('name', 'geo.placename', 'Raipur');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:locale', 'en_IN');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', img);
    upsertLink('canonical', url);

    const existing = document.getElementById('public-jsonld');
    if (existing) existing.remove();

    let script: HTMLScriptElement | null = null;
    if (jsonLdKey) {
      script = document.createElement('script');
      script.id = 'public-jsonld';
      script.type = 'application/ld+json';
      script.text = jsonLdKey;
      document.head.appendChild(script);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      if (script) script.remove();
    };
  }, [title, description, path, image, jsonLdKey, enabled]);
}
