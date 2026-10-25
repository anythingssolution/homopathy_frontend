export interface CmsHeroItem {
  id: number;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string;
  sort_order: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface CmsTestimonialItem {
  id: number;
  person_name: string;
  person_title: string | null;
  testimonial_text: string;
  image_url: string | null;
  image_key?: string | null;
  tags_json?: string | null;
  tags?: string[];
  display_date: string | null;
  sort_order: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface CmsGalleryItem {
  id: number;
  category: string;
  media_type: 'IMAGE' | 'VIDEO';
  title: string;
  description: string | null;
  image_url: string | null;
  thumb_url?: string | null;
  video_url: string | null;
  video_key?: string | null;
  poster_url?: string | null;
  display_date: string | null;
  sort_order: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface CmsTreatmentItem {
  id: number;
  slug: string;
  title_en: string;
  title_hi: string | null;
  category: string;
  description: string;
  image_url: string | null;
  image_key?: string | null;
  seo_title: string | null;
  seo_description: string | null;
  remedies?: string[];
  public_path?: string;
  sort_order: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface HomepageCmsResponse {
  hero: CmsHeroItem[];
  testimonials: CmsTestimonialItem[];
  gallery: CmsGalleryItem[];
}
