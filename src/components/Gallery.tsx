import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, X } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePublicSeo } from '../hooks/usePublicSeo';
import { GALLERY_SEO } from '../seo/publicPages';
import { getPublicGalleryCms } from '../modules/doctor-cms/api';
import { CmsGalleryItem } from '../modules/doctor-cms/types';
import Pagination from './Pagination';
import localGallery from '../data/legacyGallery.json';
import { getPublicVideoPoster, resolvePublicImage } from '../utils/publicImages';

export function getYoutubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const shortsId = parsed.pathname.match(/^\/shorts\/([^/?#]+)/)?.[1];
      if (shortsId) {
        return shortsId;
      }
      return parsed.searchParams.get('v');
    }
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace(/^\/+/, '').split('/')[0] || null;
    }
  } catch (_) {}
  return null;
}

const videoIds = [
  '3ZBPcULCu0s', 'tAT3HyBCuBA', '_5Hl5YIqo6o', 'JCwVYWI3Rlk', 'uFpsz4ZC1e8',
  'P4Agme7FHfI', '7VoswNx9vyE', 'dtesizQ3qDU', 'Tf6q7lTGWzM', 'za2jOaO7a-g',
  'KGLN8rgPrtc', '0NNuHpc8fSc', 'ZXKv-g8k-HQ', '7lD8cJ1kn4A', 'LZ7VVF1YZG4',
  'K260JuYlkyE', 'uubwKDvyito', 'jhvbXdLvA6M', 'BgdZA3XAFvA', 'jm6VSQIeCa8',
  'ISo6RDfIyTw', 'mxd5YCBDbWw', '31UtZlv9J5M', 'UGQhrfzDzHo', 'bG4jGJet870',
  'qXN-5kc-Apg', 'ZzEq7jqnIHE', 'LpGX8DAWSxA', '4rMJBnVJoss', 'WkghDRS3U6M',
  'hdM85CMaE1U', 'PlsPSVifLCc', 'Yd0QYC5lnBg', 'AwvviIFCerI', 'WgOta_3tBLs',
  'ZzzlADO82Hs'
];

const ITEMS_PER_PAGE = 9;

function categoryFromParam(param?: string): 'TREATMENT' | 'MEDIA' | 'AWARDS' | 'VIDEO' {
  const normalized = (param || '').toLowerCase();
  if (normalized === 'treatments' || normalized === 'treatment') return 'TREATMENT';
  if (normalized === 'media') return 'MEDIA';
  if (normalized === 'awards') return 'AWARDS';
  if (normalized === 'video') return 'VIDEO';
  return 'TREATMENT';
}

function pathForGalleryCategory(key: string) {
  if (key === 'MEDIA') return '/media';
  if (key === 'AWARDS') return '/awards';
  if (key === 'VIDEO') return '/video';
  return '/gallery';
}

interface GalleryItem {
  id: number;
  date: string;
  tag: string;
  title: string;
  img: string;
  videoUrl?: string;
  videoId?: string;
}

function normalizeGalleryTag(tag?: string) {
  const value = String(tag || '').toUpperCase();
  return value === 'TREATMENTS' ? 'TREATMENT' : value;
}

function galleryItemKey(item: GalleryItem) {
  if (item.videoId) return `video:${item.videoId}`;
  return `img:${item.img}`;
}

const allGalleryItems: GalleryItem[] = [
  ...localGallery.items.map((item, index) => ({
    id: 10000 + index,
    date: '',
    tag: normalizeGalleryTag(item.category),
    title: item.title,
    img: item.image_url,
  })),

  ...videoIds.map((vid, i) => ({
    id: 20000 + i,
    date: '2025.02.20',
    tag: 'VIDEO',
    title: `Clinical Insight #${i + 1}`,
    img: getPublicVideoPoster(vid),
    videoId: vid
  }))
];

function mapCmsGalleryItem(item: CmsGalleryItem): GalleryItem {
  const videoId = item.media_type === 'VIDEO'
    ? (item.video_key || (item.video_url ? getYoutubeVideoId(item.video_url) : null) || undefined)
    : undefined;
  return {
    id: item.id,
    date: item.display_date || '',
    tag: item.media_type === 'VIDEO' ? 'VIDEO' : normalizeGalleryTag(item.category),
    title: item.title,
    img: item.media_type === 'VIDEO'
      ? resolvePublicImage(item.poster_url || item.image_url || getPublicVideoPoster(videoId))
      : resolvePublicImage(item.thumb_url || item.image_url),
    videoUrl: item.video_url || undefined,
    videoId,
  };
}

function mergeGalleryItems(cmsItems: CmsGalleryItem[]): GalleryItem[] {
  const cmsMapped = [...cmsItems]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(mapCmsGalleryItem);
  const seen = new Set(cmsMapped.map(galleryItemKey));
  return [
    ...allGalleryItems.filter((item) => !seen.has(galleryItemKey(item))),
    ...cmsMapped,
  ];
}

export default function Gallery() {
  const { t } = useTranslation();
  const location = useLocation();
  const { category: categoryParam } = useParams<{ category?: string }>();
  const pathTail = location.pathname.split('/').filter(Boolean).pop();
  const activeCategory = categoryFromParam(categoryParam || pathTail);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [cmsGallery, setCmsGallery] = useState<CmsGalleryItem[]>([]);

  const categoryLabel = t(
    `gallery_page.${activeCategory === 'TREATMENT' ? 'treatments' : activeCategory.toLowerCase()}`
  );
  const gallerySeo = GALLERY_SEO[activeCategory];
  usePublicSeo({
    title: gallerySeo.title,
    description: gallerySeo.description,
    path: gallerySeo.path,
    image: localGallery.cover_url || gallerySeo.image,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  useEffect(() => {
    getPublicGalleryCms().then(res => {
      if (res.success && Array.isArray(res.data)) {
        setCmsGallery(res.data);
      }
    });
  }, []);

  const categories = [
    { key: 'TREATMENT', label: t('gallery_page.treatments') },
    { key: 'MEDIA', label: t('gallery_page.media') },
    { key: 'AWARDS', label: t('gallery_page.awards') },
    { key: 'VIDEO', label: t('gallery_page.video') }
  ];

  const galleryItems = mergeGalleryItems(cmsGallery);

  const getCategoryLabel = (tag: string) => {
    const normalizedTag = normalizeGalleryTag(tag);
    const key = normalizedTag === 'TREATMENT' ? 'treatments' : normalizedTag.toLowerCase();
    return t(`gallery_page.${key}`);
  };

  const filteredItems = galleryItems.filter(item => normalizeGalleryTag(item.tag) === activeCategory);
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const changePage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 520, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FDFDF7]">
      {/* Header Banner */}
      <div className="relative h-[300px] sm:h-[550px]">
        <div className="absolute inset-0">
          <img src={localGallery.cover_url} className="w-full h-full object-cover" alt="Gallery of Dr. Trivedi's Homeopathy Clinic in Raipur" />
        </div>
        <div className="absolute inset-0 bg-primary-teal/5" />
      </div>

      {/* Title Section with Curve */}
      <div className="relative pb-20 -mt-16">
        <div className="absolute inset-x-0 bottom-0 top-0 bg-[#FDFDF7] rounded-t-[60px]" />

        <div className="relative z-10 flex flex-col items-center pt-12">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4 text-public-heading opacity-60 mb-6">
              <div className="w-8 h-[1px] bg-current" />
              <Sparkles size={16} />
              <div className="w-8 h-[1px] bg-current" />
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-public-heading tracking-[0.15em] sm:tracking-[0.2em] mb-4">
              {t('gallery_page.title')}
            </h1>
            <span className="text-[10px] font-bold text-public-muted tracking-[0.4em] uppercase">{t('gallery_page.subtitle')}</span>

            <div className="w-12 h-1 bg-[#F2D06B] rounded-full mt-8" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 relative">
        {/* Breadcrumb */}
        <div className="text-sm sm:text-base text-public-muted mb-8 sm:mb-16 flex gap-2 font-medium">
          <Link to="/" className="hover:text-public-heading transition-colors">{t('common.home')}</Link>
          <span>&gt;</span>
          <span className="text-public-heading">{t('common.gallery')}</span>
          <span>&gt;</span>
          <span className="text-public-muted uppercase tracking-widest">{categories.find(c => c.key === activeCategory)?.label}</span>
        </div>

        {/* Mobile Category Chips */}
        <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                to={pathForGalleryCategory(cat.key)}
                className={`px-5 py-2.5 text-[11px] font-black tracking-widest whitespace-nowrap rounded-full border transition-all active:scale-95 ${
                  activeCategory === cat.key
                    ? 'bg-public-action text-white border-[#549E9E] shadow-md shadow-[#549E9E]/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#549E9E]/30'
                }`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Main Grid */}
          <div className="flex-1">
            <motion.div
              layout
              className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-8 space-y-4 sm:space-y-8"
            >
              <AnimatePresence mode='popLayout'>
                {paginatedItems.map((item) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ y: -5 }}
                    className="break-inside-avoid-column group cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="relative rounded-[20px] sm:rounded-[30px] overflow-hidden mb-3 sm:mb-4 shadow-sm group-hover:shadow-xl transition-all border border-gray-100">
                      <img
                        src={item.img}
                        className={`w-full h-auto block ${item.tag === 'VIDEO' ? 'aspect-[9/16] object-cover' : ''}`}
                        alt={item.title}
                        loading="lazy"
                      />
                      {item.tag === 'VIDEO' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-public-heading shadow-xl scale-90 group-hover:scale-100 transition-transform">
                            <Play size={20} fill="currentColor" />
                          </div>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 text-white opacity-40">✧</div>
                    </div>
                    <div className="px-2">
                      <div className="flex items-center gap-3 text-[10px] font-bold mb-2 tracking-wider">
                        <span className="text-public-muted">{item.date}</span>
                        <span className="bg-primary-teal/10 text-public-heading px-3 py-0.5 rounded-full">{getCategoryLabel(item.tag)}</span>
                      </div>
                      <h3 className="text-sm font-bold text-public-heading leading-relaxed group-hover:text-public-heading transition-colors">
                        {t(`gallery_items.${item.id}`, item.title) as string}
                      </h3>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {filteredItems.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[50px] border border-dashed border-gray-200">
                <p className="text-public-body font-medium italic">{t('gallery_page.no_items_found')}</p>
              </div>
            )}

            {filteredItems.length > ITEMS_PER_PAGE && (
              <div className="mt-10 overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={changePage}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-40 space-y-16">
              {/* Categories */}
              <div>
                <h4 className="text-lg font-bold text-public-heading tracking-[0.2em] mb-6 flex items-center justify-between">
                  <span>{t('gallery_page.category')}</span>
                  <div className="w-12 h-[1px] bg-primary-teal/20" />
                </h4>
                <div className="flex flex-col bg-white rounded-2xl p-1 shadow-sm border border-gray-100 overflow-visible">
                  {categories.map((cat) => (
                    <Link
                      key={cat.key}
                      to={pathForGalleryCategory(cat.key)}
                      className={`w-full rounded-xl px-7 py-5 text-left text-sm font-bold tracking-widest transition-all border border-transparent ${
                        activeCategory === cat.key
                          ? 'bg-gray-100 text-public-heading border-[#549E9E]/20 shadow-sm'
                          : 'text-gray-900 hover:bg-gray-50 hover:border-gray-100'
                      }`}
                    >
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Clinical Trust Highlights */}
              <div>
                <h4 className="text-lg font-bold text-public-heading tracking-[0.2em] mb-6 flex items-center justify-between">
                  <span>{t('gallery_page.excellence')}</span>
                  <div className="w-12 h-[1px] bg-primary-teal/20" />
                </h4>
                <div className="space-y-6">
                  {[
                    { label: t('gallery_page.experience'), val: '40+ Years', icon: '✨' },
                    { label: t('gallery_page.patients'), val: '20,000+', icon: '🤝' },
                    { label: t('gallery_page.awards'), val: 'International', icon: '🏆' },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{stat.icon}</span>
                        <span className="text-[10px] font-bold text-public-muted uppercase tracking-widest">{stat.label}</span>
                      </div>
                      <span className="text-sm font-black text-public-heading">{stat.val}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </aside>
        </div>
      </div>

      {/* Media Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-2xl p-4 md:p-10"
            onClick={() => setSelectedItem(null)}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-[110]"
              onClick={() => setSelectedItem(null)}
            >
              <X size={40} />
            </motion.button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl flex flex-col items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative w-full flex items-center justify-center">
                {selectedItem.tag === 'VIDEO' ? (
                  <div className="aspect-[9/16] w-full max-w-sm mx-auto rounded-[30px] overflow-hidden shadow-2xl">
                    {selectedItem.videoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedItem.videoId}?autoplay=1&playsinline=1`}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <a
                        href={selectedItem.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-full w-full items-center justify-center bg-black text-white font-bold"
                      >
                        Open Video
                      </a>
                    )}
                  </div>
                ) : (
                  <img
                    src={selectedItem.img}
                    alt={selectedItem.title}
                    className="w-full h-auto max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
