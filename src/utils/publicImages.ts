import publicImages from '../data/localPublicImages.json';
import gallery from '../data/legacyGallery.json';

export const PUBLIC_IMAGE_PLACEHOLDER = '/site-images/image-placeholder.svg';
const legacyImages = new Map<string, string>(Object.entries(publicImages.legacyImages));
gallery.items.forEach(item => {
  const originalName = item.image_url.split('/').pop()?.replace(/\.webp$/, '.jpeg');
  if (originalName) legacyImages.set(`/assets/files/gallery/${originalName}`, item.image_url);
});
const videoPosters: Record<string, string> = publicImages.videoPosters;
const legacyHosts = new Set(['drtrivedishomeopathy.in', 'www.drtrivedishomeopathy.in', 'test.businesswithinfinite.in']);

export function getPublicVideoPoster(videoId?: string | null): string {
  if (!videoId) return PUBLIC_IMAGE_PLACEHOLDER;
  return videoPosters[videoId] || `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

// Existing CMS URLs for archived images also resolve locally. Custom uploads stay unchanged.
export function resolvePublicImage(value?: string | null): string {
  const image = String(value || '').trim();
  if (!image) return PUBLIC_IMAGE_PLACEHOLDER;
  if (image.startsWith('/') && !image.startsWith('//')) return legacyImages.get(image.split('?')[0]) || image;
  try {
    const url = new URL(image.startsWith('//') ? `https:${image}` : image);
    if (legacyHosts.has(url.hostname)) {
      return legacyImages.get(url.pathname.replace(/^\/drtrivedi(?=\/)/, '')) || image;
    }
    if (url.hostname === 'img.youtube.com' || url.hostname === 'i.ytimg.com') {
      const videoId = url.pathname.match(/^\/vi(?:_webp)?\/([^/]+)\//)?.[1];
      if (videoId && videoPosters[videoId]) return videoPosters[videoId];
    }
  } catch { /* Preserve other existing local paths and embedded images. */ }
  return image;
}
