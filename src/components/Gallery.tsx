import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPublicGalleryCms } from '../modules/doctor-cms/api';
import { CmsGalleryItem } from '../modules/doctor-cms/types';
import Pagination from './Pagination';

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

interface GalleryItem {
  id: number;
  date: string;
  tag: string;
  title: string;
  img: string;
  videoUrl?: string;
  videoId?: string;
}

const allGalleryItems: GalleryItem[] = [
  // TREATMENTS Category
  { id: 1, date: '2025.04.10', tag: 'TREATMENTS', title: 'Homeopathic Consultation', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_011.jpeg' },
  { id: 2, date: '2025.04.09', tag: 'TREATMENTS', title: 'Clinical Examination', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_013.jpeg' },
  { id: 3, date: '2025.04.08', tag: 'TREATMENTS', title: 'Holistic Care Session', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_014.jpeg' },
  { id: 4, date: '2025.04.07', tag: 'TREATMENTS', title: 'Patient Wellness Check', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_015.jpeg' },
  { id: 5, date: '2025.04.06', tag: 'TREATMENTS', title: 'Classical Homeopathy Practice', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_016.jpeg' },
  { id: 6, date: '2025.04.05', tag: 'TREATMENTS', title: 'Clinic Diagnostics', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_017.jpeg' },
  { id: 7, date: '2025.04.04', tag: 'TREATMENTS', title: 'Specialized Treatment', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_025.jpeg' },
  { id: 8, date: '2025.04.03', tag: 'TREATMENTS', title: 'Healing from the Root', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_026.jpeg' },
  { id: 9, date: '2025.04.02', tag: 'TREATMENTS', title: 'Natural Remedies Session', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_027.jpeg' },
  { id: 10, date: '2025.04.01', tag: 'TREATMENTS', title: 'Clinical Success Story', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_029.jpeg' },
  { id: 11, date: '2025.03.31', tag: 'TREATMENTS', title: 'Expert Guidance', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_030.jpeg' },
  { id: 12, date: '2025.03.30', tag: 'TREATMENTS', title: 'Compassionate Care', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_031.jpeg' },
  { id: 13, date: '2025.03.29', tag: 'TREATMENTS', title: 'Modern Homeopathic Facility', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_032.jpeg' },
  { id: 14, date: '2025.03.28', tag: 'TREATMENTS', title: 'Restoring Balance', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_033.jpeg' },

  // MEDIA Category
  { id: 15, date: '2025.03.25', tag: 'MEDIA', title: 'Newspaper Coverage', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/c0279f73075a52e1a7dea35065bc8c80.jpeg' },
  { id: 16, date: '2025.03.24', tag: 'MEDIA', title: 'Medical Summit 2024', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/29150bb2319c182c944841c74d2f8d75.jpeg' },
  { id: 17, date: '2025.03.23', tag: 'MEDIA', title: 'Community Outreach', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/ae2bac2e4b4da805d01b2952d7e35ba4.jpeg' },
  { id: 18, date: '2025.03.22', tag: 'MEDIA', title: 'Public Awareness Event', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/fc1198178c3594bfdda3ca2996eb65cb.jpeg' },
  { id: 19, date: '2025.03.21', tag: 'MEDIA', title: 'Clinic Interview', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/dc5e819e186f11ef3f59e6c7d6830c35.jpeg' },
  { id: 20, date: '2025.03.20', tag: 'MEDIA', title: 'Health Awareness Seminar', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/a13ee062eff9d7295bfc800a11f33704.jpeg' },
  { id: 21, date: '2025.03.19', tag: 'MEDIA', title: 'Clinical Recognition', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/9e94b15ed312fa42232fd87a55db0d39.jpeg' },
  { id: 22, date: '2025.03.18', tag: 'MEDIA', title: 'Local News Feature', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/568628e0d993b1973adc718237da6e93.jpeg' },
  { id: 23, date: '2025.03.17', tag: 'MEDIA', title: 'Global Homeopathy Forum', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/ce08becc73195df12d99d761bfbba68d.jpeg' },
  { id: 24, date: '2025.03.16', tag: 'MEDIA', title: 'Expert Talk Session', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/11364907cf269dd2183b64287156072a.jpeg' },
  { id: 25, date: '2025.03.15', tag: 'MEDIA', title: 'Press Release 2025', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/e88a49bccde359f0cabb40db83ba6080.jpeg' },
  { id: 26, date: '2025.03.14', tag: 'MEDIA', title: 'Clinical Excellence Award', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_034.jpeg' },
  { id: 27, date: '2025.03.13', tag: 'MEDIA', title: 'Healthcare Hero Feature', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_022.jpeg' },
  { id: 28, date: '2025.03.12', tag: 'MEDIA', title: 'Raipur Clinic Highlights', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_021.jpeg' },

  // AWARDS Category
  { id: 29, date: '2025.03.10', tag: 'AWARDS', title: 'Internal Flame of Homeopathy', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/93dd4de5cddba2c733c65f233097f05a.jpeg' },
  { id: 30, date: '2025.03.09', tag: 'AWARDS', title: 'Pride of Homeopathy (Dubai)', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/dc5c7986daef50c1e02ab09b442ee34f.jpeg' },
  { id: 31, date: '2025.03.08', tag: 'AWARDS', title: 'Homeopathy Ratna Samman', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_040.jpeg' },
  { id: 32, date: '2025.03.07', tag: 'AWARDS', title: 'Youth Icon Award', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_039.jpeg' },
  { id: 33, date: '2025.03.06', tag: 'AWARDS', title: 'Legend of Youth Icon', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_038.jpeg' },
  { id: 34, date: '2025.03.05', tag: 'AWARDS', title: 'Best Skin Care Specialist', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_037.jpeg' },
  { id: 35, date: '2025.03.04', tag: 'AWARDS', title: 'Clinical Excellence Honor', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_036.jpeg' },
  { id: 36, date: '2025.03.03', tag: 'AWARDS', title: 'Health Camp Contribution', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_035.jpeg' },
  { id: 37, date: '2025.03.02', tag: 'AWARDS', title: 'Director Recognition', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_024.jpeg' },
  { id: 38, date: '2025.03.01', tag: 'AWARDS', title: 'Community Service Award', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_023.jpeg' },
  { id: 39, date: '2025.02.28', tag: 'AWARDS', title: 'Medical Excellence 2024', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_010.jpeg' },
  { id: 40, date: '2025.02.27', tag: 'AWARDS', title: 'Outstanding Achievement', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_009.jpeg' },
  { id: 41, date: '2025.02.26', tag: 'AWARDS', title: 'Global Recognition Forum', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_003.jpeg' },
  { id: 42, date: '2025.02.25', tag: 'AWARDS', title: 'Excellence in Homeopathy', img: 'https://www.drtrivedishomeopathy.in/assets/files/gallery/g_002.jpeg' },

  // VIDEO Category
  ...videoIds.map((vid, i) => ({
    id: 100 + i,
    date: '2025.02.20',
    tag: 'VIDEO',
    title: `Clinical Insight #${i + 1}`,
    img: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
    videoId: vid
  }))
];

export default function Gallery() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('TREATMENT');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [cmsGallery, setCmsGallery] = useState<CmsGalleryItem[]>([]);

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

  const galleryItems = cmsGallery.length > 0
    ? cmsGallery
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((item: any) => ({
          id: item.id,
          date: item.display_date || '',
          tag: item.category,
          title: item.title,
          img: item.media_type === 'VIDEO'
            ? item.poster_url || item.image_url || (item.video_key ? `https://img.youtube.com/vi/${item.video_key}/hqdefault.jpg` : '')
            : item.thumb_url || item.image_url || '',
          videoUrl: item.video_url || undefined,
          videoId: item.media_type === 'VIDEO'
            ? (item.video_key || (item.video_url ? getYoutubeVideoId(item.video_url) : null) || undefined)
            : undefined
        }))
    : allGalleryItems;

  const getCategoryLabel = (tag: string) => {
    const normalizedTag = tag === 'TREATMENTS' ? 'TREATMENT' : tag;
    const key = normalizedTag === 'TREATMENT' ? 'treatments' : normalizedTag.toLowerCase();
    return t(`gallery_page.${key}`);
  };

  const filteredItems = galleryItems.filter(item => (
    item.tag === activeCategory || (activeCategory === 'TREATMENT' && item.tag === 'TREATMENTS')
  ));
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const changeCategory = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const changePage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 520, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FDFDF7]">
      {/* Header Banner */}
      <div className="relative h-[300px] sm:h-[550px]">
        <div className="absolute inset-0">
          <img src="https://www.drtrivedishomeopathy.in/assets/imgs/himg-2.jpeg" className="w-full h-full object-cover" alt="Gallery Cover" />
        </div>
        <div className="absolute inset-0 bg-primary-teal/5" />
      </div>

      {/* Title Section with Curve */}
      <div className="relative pb-20 -mt-16">
        <div className="absolute inset-x-0 bottom-0 top-0 bg-[#FDFDF7] rounded-t-[60px]" />

        <div className="relative z-10 flex flex-col items-center pt-12">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4 text-primary-teal opacity-60 mb-6">
              <div className="w-8 h-[1px] bg-current" />
              <Sparkles size={16} />
              <div className="w-8 h-[1px] bg-current" />
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-[#549E9E] tracking-[0.15em] sm:tracking-[0.2em] mb-4">
              {t('gallery_page.title')}
            </h1>
            <span className="text-[10px] font-bold text-primary-teal/60 tracking-[0.4em] uppercase">{t('gallery_page.subtitle')}</span>

            <div className="w-12 h-1 bg-[#F2D06B] rounded-full mt-8" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 relative">
        {/* Breadcrumb */}
        <div className="text-sm sm:text-base text-gray-400 mb-8 sm:mb-16 flex gap-2 font-medium">
          <Link to="/" className="hover:text-primary-teal transition-colors">{t('common.home')}</Link>
          <span>&gt;</span>
          <span className="text-primary-teal">{t('common.gallery')}</span>
          <span>&gt;</span>
          <span className="text-primary-teal/60 uppercase tracking-widest">{categories.find(c => c.key === activeCategory)?.label}</span>
        </div>

        {/* Mobile Category Chips */}
        <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => changeCategory(cat.key)}
                className={`px-5 py-2.5 text-[11px] font-black tracking-widest whitespace-nowrap rounded-full border transition-all active:scale-95 ${
                  activeCategory === cat.key
                    ? 'bg-[#549E9E] text-white border-[#549E9E] shadow-md shadow-[#549E9E]/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#549E9E]/30'
                }`}
              >
                {cat.label}
              </button>
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
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-primary-teal shadow-xl scale-90 group-hover:scale-100 transition-transform">
                            <Play size={20} fill="currentColor" />
                          </div>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 text-white opacity-40">✧</div>
                    </div>
                    <div className="px-2">
                      <div className="flex items-center gap-3 text-[10px] font-bold mb-2 tracking-wider">
                        <span className="text-primary-teal/60">{item.date}</span>
                        <span className="bg-primary-teal/10 text-primary-teal px-3 py-0.5 rounded-full">{getCategoryLabel(item.tag)}</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#549E9E] leading-relaxed group-hover:text-primary-teal transition-colors">
                        {t(`gallery_items.${item.id}`, item.title) as string}
                      </h3>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {filteredItems.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[50px] border border-dashed border-gray-200">
                <p className="text-[#6A6A50] font-medium italic">{t('gallery_page.no_items_found')}</p>
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
                <h4 className="text-lg font-bold text-[#549E9E] tracking-[0.2em] mb-6 flex items-center justify-between">
                  <span>{t('gallery_page.category')}</span>
                  <div className="w-12 h-[1px] bg-primary-teal/20" />
                </h4>
                <div className="flex flex-col bg-white rounded-2xl p-1 shadow-sm border border-gray-100 overflow-visible">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => changeCategory(cat.key)}
                      className={`w-full rounded-xl px-7 py-5 text-left text-sm font-bold tracking-widest transition-all border border-transparent ${
                        activeCategory === cat.key
                          ? 'bg-gray-100 text-[#549E9E] border-[#549E9E]/20 shadow-sm'
                          : 'text-gray-900 hover:bg-gray-50 hover:border-gray-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clinical Trust Highlights */}
              <div>
                <h4 className="text-lg font-bold text-[#549E9E] tracking-[0.2em] mb-6 flex items-center justify-between">
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
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                      </div>
                      <span className="text-sm font-black text-primary-teal">{stat.val}</span>
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
