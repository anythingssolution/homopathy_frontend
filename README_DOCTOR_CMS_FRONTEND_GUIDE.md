# Doctor CMS Frontend Integration Guide

This README is for the frontend developer who will:

1. build the **Doctor CMS panel**
2. connect the public homepage **Hero / Testimonials / Gallery** to the new CMS APIs

---

## 1) Current frontend files to update

### Public homepage / website
- `src/components/Hero.tsx`
- `src/components/Testimonials.tsx`
- `src/components/Gallery.tsx`

### Doctor side
Recommended new module:
- `src/modules/doctor-cms/`

Suggested files:
- `src/modules/doctor-cms/DoctorCmsPage.tsx`
- `src/modules/doctor-cms/components/HeroCmsTab.tsx`
- `src/modules/doctor-cms/components/TestimonialsCmsTab.tsx`
- `src/modules/doctor-cms/components/GalleryCmsTab.tsx`
- `src/modules/doctor-cms/api.ts`
- `src/modules/doctor-cms/types.ts`

---

## 2) Backend APIs available

Base URL style already used in project:
- authenticated doctor APIs: `/api/v1/doctors/...`
- public APIs: `/api/v1/public/...`

---

## 3) Public CMS API

Use this on website/public pages:

### `GET /api/v1/public/cms/homepage`

### Response shape
```json
{
  "success": true,
  "message": "Homepage CMS fetched successfully",
  "data": {
    "hero": [
      {
        "id": 1,
        "title": "Hero title",
        "subtitle": "Hero subtitle",
        "cta_text": "Book Now",
        "cta_link": "/appointment",
        "image_url": "https://example.com/hero.jpg",
        "sort_order": 1,
        "is_active": 1,
        "created_at": "2026-05-25T10:00:00.000Z",
        "updated_at": "2026-05-25T10:00:00.000Z"
      }
    ],
    "testimonials": [
      {
        "id": 1,
        "person_name": "Patient Name",
        "person_title": "Skin Case",
        "testimonial_text": "Very good result",
        "image_url": "https://example.com/testimonial.jpg",
        "tags_json": "[\"Skin\",\"Hair\"]",
        "tags": ["Skin", "Hair"],
        "display_date": "2026-05-25",
        "sort_order": 1,
        "is_active": 1,
        "created_at": "2026-05-25T10:00:00.000Z",
        "updated_at": "2026-05-25T10:00:00.000Z"
      }
    ],
    "gallery": [
      {
        "id": 1,
        "category": "MEDIA",
        "media_type": "IMAGE",
        "title": "Media coverage",
        "description": "Short text",
        "image_url": "https://example.com/gallery.jpg",
        "video_url": null,
        "display_date": "2026-05-25",
        "sort_order": 1,
        "is_active": 1,
        "created_at": "2026-05-25T10:00:00.000Z",
        "updated_at": "2026-05-25T10:00:00.000Z"
      }
    ]
  }
}
```

### Important
- Public endpoint returns **only active items**
- Ordering is already handled by backend using `sort_order ASC, id ASC`
- For testimonials, backend also sends parsed `tags`

---

## 4) Doctor CMS APIs

These require doctor auth token.

## 4.1 Combined CMS fetch

### `GET /api/v1/doctors/cms/homepage`

Use this on doctor CMS page load if you want all tabs in one hit.

---

## 4.2 Hero CMS APIs

### List
`GET /api/v1/doctors/cms/hero`

### Create
`POST /api/v1/doctors/cms/hero`

### Update
`PUT /api/v1/doctors/cms/hero/:id`

### Delete
`DELETE /api/v1/doctors/cms/hero/:id`

### Hero payload
```json
{
  "title": "Hero title",
  "subtitle": "Hero subtitle",
  "cta_text": "Book Now",
  "cta_link": "/appointment",
  "image_url": "https://example.com/hero.jpg",
  "sort_order": 1,
  "is_active": true
}
```

### Validation notes
- `image_url` required
- upload API abhi nahi hai
- doctor ko direct image URL dena hoga

---

## 4.3 Testimonials CMS APIs

### List
`GET /api/v1/doctors/cms/testimonials`

### Create
`POST /api/v1/doctors/cms/testimonials`

### Update
`PUT /api/v1/doctors/cms/testimonials/:id`

### Delete
`DELETE /api/v1/doctors/cms/testimonials/:id`

### Testimonial payload
```json
{
  "person_name": "Patient Name",
  "person_title": "Hair Fall Case",
  "testimonial_text": "Result was very good",
  "image_url": "https://example.com/testimonial.jpg",
  "tags": ["Hair", "Recovery"],
  "display_date": "2026-05-25",
  "sort_order": 1,
  "is_active": true
}
```

### Validation notes
- `person_name` required
- `testimonial_text` required
- `tags` should be sent as array

---

## 4.4 Gallery CMS APIs

### List
`GET /api/v1/doctors/cms/gallery`

### Create
`POST /api/v1/doctors/cms/gallery`

### Update
`PUT /api/v1/doctors/cms/gallery/:id`

### Delete
`DELETE /api/v1/doctors/cms/gallery/:id`

### Gallery IMAGE payload
```json
{
  "category": "MEDIA",
  "media_type": "IMAGE",
  "title": "Media coverage",
  "description": "Optional description",
  "image_url": "https://example.com/gallery.jpg",
  "display_date": "2026-05-25",
  "sort_order": 1,
  "is_active": true
}
```

### Gallery VIDEO payload
```json
{
  "category": "VIDEO",
  "media_type": "VIDEO",
  "title": "Doctor video talk",
  "description": "Optional description",
  "video_url": "https://www.youtube.com/watch?v=abc123",
  "display_date": "2026-05-25",
  "sort_order": 1,
  "is_active": true
}
```

### Validation notes
- `title` required
- `media_type` must be `IMAGE` or `VIDEO`
- for `IMAGE` -> `image_url` required
- for `VIDEO` -> `video_url` required

---

## 5) Recommended frontend TypeScript types

```ts
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
  video_url: string | null;
  display_date: string | null;
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
```

---

## 6) Important normalization note

Current backend behavior:

### Public combined endpoint
`GET /api/v1/public/cms/homepage`
- testimonials me `tags` parsed array milta hai

### Doctor combined/list endpoint
`GET /api/v1/doctors/cms/homepage`
- testimonials me `tags` parsed array milta hai

### Doctor create/update endpoint
`POST/PUT /api/v1/doctors/cms/testimonials...`
- response me raw DB row aa sakta hai
- `tags_json` string ho sakta hai

### Recommendation
Frontend me normalize helper banao:

```ts
export function normalizeTestimonial(item: any) {
  return {
    ...item,
    tags: Array.isArray(item.tags)
      ? item.tags
      : item.tags_json
        ? JSON.parse(item.tags_json)
        : [],
  };
}
```

---

## 7) Doctor CMS panel implementation plan

## 7.1 UI structure
Recommended page:

- `Doctor CMS`
  - `Hero`
  - `Testimonials`
  - `Gallery`

Best UX: tabs

```txt
[ Hero ] [ Testimonials ] [ Gallery ]
```

---

## 7.2 Hero tab

Fields:
- title
- subtitle
- cta_text
- cta_link
- image_url
- sort_order
- is_active

Actions:
- list all slides
- add slide
- edit slide
- delete slide
- toggle active

---

## 7.3 Testimonials tab

Fields:
- person_name
- person_title
- testimonial_text
- image_url
- tags
- display_date
- sort_order
- is_active

Actions:
- list cards
- add
- edit
- delete

Input suggestion:
- tags as comma-separated input in form
- before submit convert to array

---

## 7.4 Gallery tab

Fields:
- category
- media_type
- title
- description
- image_url
- video_url
- display_date
- sort_order
- is_active

Actions:
- list grid/table
- add
- edit
- delete
- filter by category

Suggested category options:
- `TREATMENTS`
- `MEDIA`
- `AWARDS`
- `VIDEO`

---

## 7.5 Auth headers

Use same auth pattern already used in app:

```ts
headers: {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 8) Suggested API wrapper

```ts
const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export async function getDoctorHomepageCms(token: string) {
  const res = await fetch('/api/v1/doctors/cms/homepage', {
    headers: authHeaders(token),
  });
  return res.json();
}

export async function getPublicHomepageCms() {
  const res = await fetch('/api/v1/public/cms/homepage');
  return res.json();
}
```

---

## 9) How to connect Hero.tsx

Current `Hero.tsx` hardcodes:
- `images = ['/slide1.jpeg', ...]`

Replace with CMS:

### expected mapping
```ts
const heroImages = cms.hero
  .filter(item => item.is_active === 1)
  .sort((a, b) => a.sort_order - b.sort_order)
  .map(item => item.image_url);
```

### Better improvement
Instead of only image list, use full slide object:

```ts
const slides = cms.hero;
const activeSlide = slides[currentIndex];
```

Then future me:
- title
- subtitle
- CTA button

all CMS-driven ho jayega.

### Fallback
If API fails or returns empty:
- keep old hardcoded slide images as fallback

---

## 10) How to connect Testimonials.tsx

Current `Testimonials.tsx` i18n based hai.

Recommended replacement:

```ts
const testimonials = cms.testimonials.map(item => ({
  id: item.id,
  title: item.testimonial_text,
  date: item.display_date,
  tags: item.tags || [],
  img: item.image_url,
  name: item.person_name,
  personTitle: item.person_title,
}));
```

### UI note
Current UI image-first card use karta hai.
If `image_url` missing ho:
- placeholder image use karo
- ya card variant without image

---

## 11) How to connect Gallery.tsx

Current `Gallery.tsx` hardcoded large array use karta hai.

Replace with:

```ts
const galleryItems = cms.gallery.map(item => ({
  id: item.id,
  date: item.display_date,
  tag: item.category,
  title: item.title,
  img: item.image_url || '',
  mediaType: item.media_type,
  videoUrl: item.video_url,
}));
```

### For video items
Current component `videoId` use karta hai.

Backend abhi `video_url` store karta hai.

Frontend ko either:
1. direct video URL use karna hoga, or
2. helper se YouTube video id extract karni hogi

Example:

```ts
export function getYoutubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '');
    }
  } catch (_) {}
  return null;
}
```

---

## 12) Recommended loading strategy

For public site:

### Option A
Each component fetches separately through shared homepage hook

### Option B (recommended)
Homepage parent fetches once:

```ts
GET /api/v1/public/cms/homepage
```

then pass props to:
- Hero
- Testimonials
- Gallery

This is better because:
- single request
- same CMS snapshot
- less duplicate loading states

---

## 13) Recommended fallback strategy

Until CMS data is fully entered in admin:

### Hero fallback
keep static slide images

### Testimonials fallback
keep current i18n testimonials

### Gallery fallback
keep current hardcoded gallery array

Recommended pattern:

```ts
const finalHeroItems = cms.hero?.length ? cms.hero : fallbackHeroItems;
```

---

## 14) Error handling recommendation

Always handle:
- network failure
- empty array
- malformed `tags_json`
- bad `video_url`
- missing `image_url`

Safe UX:
- log error
- show fallback content
- do not break homepage render

---

## 15) Suggested implementation order

### Phase 1
Create doctor CMS API wrapper + types

### Phase 2
Build doctor CMS page with tabs:
- Hero
- Testimonials
- Gallery

### Phase 3
Connect public homepage CMS fetch

### Phase 4
Replace:
- `Hero.tsx`
- `Testimonials.tsx`
- `Gallery.tsx`

### Phase 5
Add graceful fallback to existing static content

---

## 16) Known backend limitation right now

Current backend supports:
- URL-based image/video data
- CRUD
- active flag
- sort order

Current backend does **not yet support**:
- direct image upload
- drag-drop reorder API
- bulk reorder API
- draft/publish workflow

So frontend should assume:
- manual `sort_order` field
- manual image URL input

---

## 17) Quick example payloads for forms

## Hero form submit
```ts
{
  title: form.title,
  subtitle: form.subtitle,
  cta_text: form.ctaText,
  cta_link: form.ctaLink,
  image_url: form.imageUrl,
  sort_order: Number(form.sortOrder || 0),
  is_active: form.isActive
}
```

## Testimonial form submit
```ts
{
  person_name: form.personName,
  person_title: form.personTitle,
  testimonial_text: form.testimonialText,
  image_url: form.imageUrl,
  tags: form.tagsText
    .split(',')
    .map(v => v.trim())
    .filter(Boolean),
  display_date: form.displayDate || null,
  sort_order: Number(form.sortOrder || 0),
  is_active: form.isActive
}
```

## Gallery form submit
```ts
{
  category: form.category,
  media_type: form.mediaType,
  title: form.title,
  description: form.description,
  image_url: form.mediaType === 'IMAGE' ? form.imageUrl : null,
  video_url: form.mediaType === 'VIDEO' ? form.videoUrl : null,
  display_date: form.displayDate || null,
  sort_order: Number(form.sortOrder || 0),
  is_active: form.isActive
}
```

---

## 18) Final recommendation

For easiest implementation:

1. build doctor CMS panel first  
2. enter sample CMS data  
3. then connect public homepage  

This avoids developing public UI blindly without data.

---

## 19) Related backend files

- `homopathy_clinic_backend_node_js/controllers/v1/doctor/cmsController.js`
- `homopathy_clinic_backend_node_js/controllers/v1/publicCmsController.js`
- `homopathy_clinic_backend_node_js/services/homepageCmsService.js`
- `homopathy_clinic_backend_node_js/routes/v1/doctorRoutes.js`
- `homopathy_clinic_backend_node_js/routes/v1/publicRoutes.js`
- `homopathy_clinic_backend_node_js/sql/2026-05-25_doctor_homepage_cms.sql`

