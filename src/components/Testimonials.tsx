import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ScrollReveal } from './ScrollReveal';
import { CmsTestimonialItem } from '../modules/doctor-cms/types';

interface TestimonialsProps {
  cmsData?: CmsTestimonialItem[];
}

export default function Testimonials({ cmsData }: TestimonialsProps = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const fallbackTestimonials = (t('testimonials.items', { returnObjects: true }) as any[]).map(item => ({
    ...item,
    img: `https://www.drtrivedishomeopathy.in/assets/imgs/testimonial/c${item.id}.jpeg`
  }));

  const testimonials = cmsData && cmsData.length > 0
    ? cmsData
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(item => ({
          id: item.id,
          title: item.testimonial_text,
          date: item.display_date || '',
          tags: item.tags || [],
          img: item.image_url || 'https://via.placeholder.com/350x260?text=No+Image',
          name: item.person_name,
          personTitle: item.person_title
        }))
    : fallbackTestimonials;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400; // Adjust scroll distance
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative bg-white py-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Heading Area */}
        <ScrollReveal width="100%" direction="up" distance={30}>
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="relative">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 border border-primary-teal/10 rounded-full flex items-center justify-center">
                <div className="text-[12px] text-primary-teal font-bold tracking-widest flex flex-col items-center">
                  <span className="mb-2">{t('common.homeopathy_health')}</span>
                  <div className="w-4 h-4 bg-primary-teal rotate-45" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
                </div>
              </div>
              <h2 className="text-4xl font-bold text-primary-teal tracking-[0.25em] pt-10 text-center uppercase">
                {t('common.testimonials_title')}
              </h2>
              {/* Dash divider */}
              <div className="flex justify-center gap-1 mt-6">
                <div className="w-10 h-1 bg-yellow-300 rounded-full" />
                <div className="w-10 h-1 bg-primary-teal/40 rounded-full" />
                <div className="w-10 h-1 bg-primary-teal/60 rounded-full" />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Full Width Testimonials Scroll */}
      <div className="w-full relative group mt-10">
        <ScrollReveal width="100%" direction="up" delay={0.3}>
          <div className="relative">
            {/* Navigation Arrows */}
            <button 
              onClick={() => scroll('left')}
              className="absolute left-8 top-[40%] -translate-y-1/2 z-10 w-12 h-12 bg-white/90 border border-primary-teal/20 rounded-full flex items-center justify-center text-primary-teal shadow-xl hover:bg-primary-teal hover:text-white transition-all opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0"
              aria-label="Scroll Left"
            >
              <ChevronLeft size={24} />
            </button>
            
            <button 
              onClick={() => scroll('right')}
              className="absolute right-8 top-[40%] -translate-y-1/2 z-10 w-12 h-12 bg-white/90 border border-primary-teal/20 rounded-full flex items-center justify-center text-primary-teal shadow-xl hover:bg-primary-teal hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
              aria-label="Scroll Right"
            >
              <ChevronRight size={24} />
            </button>

            <div 
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory gap-10 pb-12 scrollbar-none px-[calc((100vw-80rem)/2)] scroll-smooth"
            >
              {testimonials.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -10 }}
                  className="snap-start flex-shrink-0 w-[22rem] group relative"
                >
                  {/* Image Card */}
                  <div className="relative aspect-[4/3] rounded-[40px] overflow-hidden bg-white shadow-sm ring-1 ring-black/5 mb-6">
                    <img
                      src={item.img}
                      alt={`Testimonial ${item.id}`}
                      className="w-full h-full object-contain p-2"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-primary-teal/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 text-xs font-bold mb-3 tracking-wider">
                    <span className="text-gray-400">{item.date}</span>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="bg-[#549E9E] text-white px-4 py-1 rounded-full text-[9px] uppercase tracking-wider">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-primary-teal leading-relaxed tracking-tight group-hover:underline underline-offset-8 decoration-dotted transition-all">
                    {item.title}
                  </h3>

                  {/* Small Sparkle between cards */}
                  <div className="absolute -right-7 top-[75%] text-yellow-400/60 text-lg pointer-events-none group-last:hidden">✦</div>
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-10">

        <a 
          href="https://www.google.com/maps/search/?api=1&query=Dr.Trivedis+Homeopathy+Clinic+Purani+Basti+Raipur"
          target="_blank"
          rel="noopener noreferrer"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="border-2 border-primary-teal text-primary-teal px-16 py-3.5 rounded-full flex items-center gap-4 mx-auto mt-10 font-bold hover:bg-primary-teal hover:text-white transition-all group"
          >
            <span>{t('common.view_all_reviews')}</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </motion.button>
        </a>
      </div>
    </section>
  );
}
