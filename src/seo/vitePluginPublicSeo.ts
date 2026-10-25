import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { treatmentsData } from '../data/treatmentsData';
import {
  aliasPublicSeoPages,
  allPublicSeoPages,
  buildSitemapXml,
  treatmentsIndexJsonLd,
  SITE_NAME,
  SITE_ORIGIN,
  type PublicSeoPage,
} from './publicPages';

function escapeAttr(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function pageUrl(pagePath: string) {
  return `${SITE_ORIGIN}${pagePath === '/' ? '/' : pagePath}`;
}

function canonicalUrl(page: PublicSeoPage) {
  return pageUrl(page.canonicalPath || page.path);
}

function absoluteImage(image?: string) {
  const src = image || '/slide1.jpeg';
  if (src.startsWith('http')) return src;
  return `${SITE_ORIGIN}${encodeURI(src)}`;
}

export function applyPublicSeoToHtml(html: string, page: PublicSeoPage): string {
  const title = escapeAttr(page.title);
  const description = escapeAttr(page.description);
  const url = canonicalUrl(page);
  const image = escapeAttr(absoluteImage(page.image));

  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);

  if (/<meta\s+name="description"/i.test(out)) {
    out = out.replace(
      /<meta\s+name="description"[^>]*>/i,
      `<meta name="description" content="${description}" />`
    );
  } else {
    out = out.replace('</title>', `</title>\n    <meta name="description" content="${description}" />`);
  }

  out = out.replace(/\s*<link rel="canonical"[^>]*>/gi, '');
  out = out.replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, '');
  out = out.replace(/\s*<meta name="twitter:[^"]+"[^>]*>/gi, '');
  out = out.replace(/\s*<meta name="geo\.[^"]+"[^>]*>/gi, '');
  out = out.replace(/\s*<meta name="robots"[^>]*>/gi, '');
  out = out.replace(/\s*<script type="application\/ld\+json" id="public-jsonld">[\s\S]*?<\/script>/gi, '');

  const jsonLd = page.jsonLd
    ? `\n    <script type="application/ld+json" id="public-jsonld">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`
    : '';

  const extra = `
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="index,follow" />
    <meta name="geo.region" content="IN-CG" />
    <meta name="geo.placename" content="Raipur" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:locale" content="en_IN" />
    <meta property="og:site_name" content="${escapeAttr(SITE_NAME)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />${jsonLd}`;

  return out.replace('</head>', `${extra}\n  </head>`);
}

function writeRouteHtml(outDir: string, routePath: string, html: string) {
  const relative =
    routePath === '/'
      ? 'index.html'
      : path.join(...routePath.split('/').filter(Boolean), 'index.html');
  const file = path.join(outDir, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

export function publicSeoHtmlPlugin(): Plugin {
  let outDir = 'dist';

  return {
    name: 'public-seo-html',
    apply: 'build',
    enforce: 'post',
    configResolved(config: ResolvedConfig) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const indexPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      const template = fs.readFileSync(indexPath, 'utf8');
      const canonicalPages = allPublicSeoPages(treatmentsData).map((page) =>
        page.path === '/treatments'
          ? { ...page, jsonLd: treatmentsIndexJsonLd(treatmentsData) }
          : page
      );
      const pages = [...canonicalPages, ...aliasPublicSeoPages(treatmentsData)];

      for (const page of pages) {
        writeRouteHtml(outDir, page.path, applyPublicSeoToHtml(template, page));
      }

      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemapXml(canonicalPages));
    },
  };
}
