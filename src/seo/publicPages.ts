import { treatmentPath, treatmentPublicSlug, type TreatmentItem } from '../data/treatmentsData';
import { PUBLIC_PATHS, PUBLIC_REDIRECTS } from './publicPaths';

export const SITE_ORIGIN = 'https://drtrivedishomeopathy.in';
export const SITE_NAME = "Dr. Trivedi's Homeopathy Clinic";
export const DEFAULT_OG_IMAGE = '/slide1.jpeg';

export type PublicSeoPage = {
  path: string;
  canonicalPath?: string;
  title: string;
  description: string;
  image?: string;
  jsonLd?: Record<string, unknown> | null;
};

export const CLINIC_JSON_LD: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'MedicalClinic',
  '@id': `${SITE_ORIGIN}/#clinic`,
  name: SITE_NAME,
  url: SITE_ORIGIN,
  image: `${SITE_ORIGIN}/slide1.jpeg`,
  telephone: '+91-7772043001',
  email: 'care@drtrivedishomeopathy.in',
  foundingDate: '1983',
  medicalSpecialty: 'Homeopathy',
  areaServed: {
    '@type': 'City',
    name: 'Raipur',
    containedInPlace: {
      '@type': 'State',
      name: 'Chhattisgarh',
    },
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Lily Chowk, Barai Mandir Gali, Purani Basti',
    addressLocality: 'Raipur',
    addressRegion: 'Chhattisgarh',
    postalCode: '492001',
    addressCountry: 'IN',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 21.233441,
    longitude: 81.624326,
  },
  hasMap: 'https://www.google.com/maps/place/Dr.Trivedis+Homeopathy+Clinic+:+Purani+Basti',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
      opens: '11:00',
      closes: '14:30',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
      opens: '18:00',
      closes: '21:00',
    },
  ],
  sameAs: [
    'https://www.instagram.com/drtrivedishomeopathy/',
    'https://www.facebook.com/drtrivedishomeopathy/',
    'https://www.youtube.com/@drtrivedishomeopathy',
    'https://wa.me/+918462030001',
  ],
};

const ABOUT_JSON_LD: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@graph': [
    CLINIC_JSON_LD,
    {
      '@type': 'Physician',
      name: 'Dr. Uttkarsh Trivedi',
      jobTitle: 'Homeopathic Physician',
      worksFor: { '@id': `${SITE_ORIGIN}/#clinic` },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Raipur',
        addressRegion: 'Chhattisgarh',
        addressCountry: 'IN',
      },
    },
    {
      '@type': 'AboutPage',
      name: 'About Homeopathy Doctor in Raipur',
      url: `${SITE_ORIGIN}${PUBLIC_PATHS.about}`,
      description:
        "Dr. Trivedi's Homeopathy Clinic in Raipur, established in 1983 by Dr. Vidyakant Trivedi and now led by Dr. Uttkarsh Trivedi.",
      mainEntity: { '@id': `${SITE_ORIGIN}/#clinic` },
    },
  ],
};

export const HOME_SEO: PublicSeoPage = {
  path: '/',
  title: "Best Homeopathy Clinic in Raipur | Dr. Trivedi's Homeopathy – Trusted Since 1983",
  description:
    "Dr. Trivedi's Homeopathy Clinic in Raipur — trusted homeopathic care since 1983. Personalized treatment for kidney stones, arthritis, skin, respiratory, and chronic conditions by Dr. Uttkarsh Trivedi.",
  image: '/slide1.jpeg',
  jsonLd: CLINIC_JSON_LD,
};

export const ABOUT_SEO: PublicSeoPage = {
  path: PUBLIC_PATHS.about,
  title: "About Homeopathy Doctor in Raipur | Dr. Trivedi's Homeopathy – 40+ Years of Trust",
  description:
    "Meet Dr. Uttkarsh Trivedi, homeopathy doctor in Raipur. Dr. Trivedi's Homeopathy Clinic was founded in 1983 by Dr. Vidyakant Trivedi and remains Raipur's trusted centre for classical homeopathy.",
  image: '/site-images/images/about-cover.webp',
  jsonLd: ABOUT_JSON_LD,
};

export const TREATMENTS_SEO: PublicSeoPage = {
  path: PUBLIC_PATHS.treatments,
  title: 'Homeopathic Treatment in Raipur | Dr. Trivedi Clinic | Book Online Now',
  description:
    'Specialized homeopathic treatments in Raipur for kidney stones, arthritis, allergies, skin diseases, respiratory issues, thyroid, infertility, and chronic conditions at Dr. Trivedi’s Homeopathy Clinic.',
  image: '/site-images/images/treatments-cover.webp',
};

export const CONTACT_SEO: PublicSeoPage = {
  path: PUBLIC_PATHS.contact,
  title: "Contact Natural Homeopathic Healing in Raipur | Since 1983 | Dr. Trivedi's Clinic",
  description:
    'Visit Dr. Trivedi’s Homeopathy Clinic in Raipur at Lily Chowk, Purani Basti and Devendra Nagar, Pandri. Call +91-7772043001 or book a homeopathic appointment.',
  image: '/slide1.jpeg',
  jsonLd: CLINIC_JSON_LD,
};

export const BOOKING_SEO: PublicSeoPage = {
  path: PUBLIC_PATHS.booking,
  title: "Book Homeopathy Appointment in Raipur | Dr. Trivedi's Homeopathy",
  description:
    'Book a homeopathic consultation with Dr. Uttkarsh Trivedi in Raipur. Morning and evening clinic hours at Lily Chowk and Pandri.',
  image: '/slide1.jpeg',
};

export const GALLERY_SEO: Record<'TREATMENT' | 'MEDIA' | 'AWARDS' | 'VIDEO', PublicSeoPage> = {
  TREATMENT: {
    path: PUBLIC_PATHS.gallery,
    title: "Homeopathy Clinic Gallery in Raipur | Dr. Trivedi's Homeopathy",
    description:
      "Photos from Dr. Trivedi's Homeopathy Clinic in Raipur — treatment rooms, patients, and clinic life at Lily Chowk and Pandri.",
    image: '/gallery/images/gallery-cover.webp',
  },
  MEDIA: {
    path: PUBLIC_PATHS.media,
    title: "Media Coverage | Homeopathy Clinic in Raipur | Dr. Trivedi's Homeopathy",
    description:
      "News and media coverage of Dr. Trivedi's Homeopathy Clinic and Dr. Uttkarsh Trivedi, homeopathy doctor in Raipur.",
    image: '/gallery/images/gallery-cover.webp',
  },
  AWARDS: {
    path: PUBLIC_PATHS.awards,
    title: "Awards & Recognition | Dr. Trivedi's Homeopathy Clinic Raipur",
    description:
      "Awards and recognition for Dr. Trivedi's Homeopathy Clinic in Raipur — 40+ years of trusted homeopathic care.",
    image: '/gallery/images/gallery-cover.webp',
  },
  VIDEO: {
    path: PUBLIC_PATHS.video,
    title: "Videos | Homeopathy Clinic in Raipur | Dr. Trivedi's Homeopathy",
    description:
      "Health talks, patient stories, and clinic videos from Dr. Trivedi's Homeopathy Clinic in Raipur.",
    image: '/gallery/images/gallery-cover.webp',
  },
};

export const STATIC_PUBLIC_SEO: PublicSeoPage[] = [
  HOME_SEO,
  ABOUT_SEO,
  TREATMENTS_SEO,
  CONTACT_SEO,
  BOOKING_SEO,
  GALLERY_SEO.TREATMENT,
  GALLERY_SEO.MEDIA,
  GALLERY_SEO.AWARDS,
  GALLERY_SEO.VIDEO,
];

function clipDescription(text: string, max = 158) {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export function treatmentsIndexJsonLd(treatments: TreatmentItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Homeopathic Treatments in Raipur',
    itemListElement: treatments.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_ORIGIN}${treatmentPath(item)}`,
      name: `${item.en} Treatment in Raipur`,
    })),
  };
}

export function treatmentSeo(item: TreatmentItem): PublicSeoPage {
  const path = treatmentPath(item);
  return {
    path,
    title: item.seoTitle || `${item.en} Treatment in Raipur | Dr. Trivedi's Homeopathy`,
    description: item.seoDescription || clipDescription(
      `Homeopathic ${item.en.toLowerCase()} treatment in Raipur at Dr. Trivedi's Homeopathy Clinic. ${item.description}`
    ),
    image: item.image || DEFAULT_OG_IMAGE,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      name: `${item.en} Homeopathic Treatment in Raipur`,
      description: item.description,
      url: `${SITE_ORIGIN}${path}`,
      about: {
        '@type': 'MedicalCondition',
        name: item.en,
      },
      specialty: 'Homeopathy',
      publisher: { '@id': `${SITE_ORIGIN}/#clinic` },
    },
  };
}

export function allPublicSeoPages(treatments: TreatmentItem[]): PublicSeoPage[] {
  return [...STATIC_PUBLIC_SEO, ...treatments.map(treatmentSeo)];
}

export function aliasPublicSeoPages(treatments: TreatmentItem[]): PublicSeoPage[] {
  const aliases: PublicSeoPage[] = PUBLIC_REDIRECTS.map((redirect) => {
    const canonical = STATIC_PUBLIC_SEO.find((page) => page.path === redirect.to) || HOME_SEO;
    return {
      ...canonical,
      path: redirect.from,
      canonicalPath: redirect.to,
    };
  });

  for (const item of treatments) {
    const publicSlug = treatmentPublicSlug(item);
    if (publicSlug === item.id) continue;
    const canonical = treatmentSeo(item);
    aliases.push({
      ...canonical,
      path: `/treatments/${item.id}`,
      canonicalPath: canonical.path,
    });
  }

  return aliases;
}

export function buildSitemapXml(pages: PublicSeoPage[], lastmod = '2026-10-25'): string {
  const urls = pages
    .map((page) => {
      const loc = `${SITE_ORIGIN}${page.path === '/' ? '/' : page.path}`;
      const priority =
        page.path === '/' ? '1.0' : page.path.startsWith('/treatments/') && page.path !== '/treatments' ? '0.8' : page.path === '/treatments' ? '0.9' : '0.8';
      const changefreq = page.path === '/' || page.path === '/treatments' || page.path.startsWith('/gallery') || page.path === '/media' || page.path === '/awards' || page.path === '/video' ? 'weekly' : 'monthly';
      return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
