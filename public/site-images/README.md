# Public website images

This folder contains the remaining public-site image archive:

- 11 testimonial images from the original clinic website.
- About page cover and doctor photo.
- Treatments page cover.
- 36 preview thumbnails for existing YouTube videos.
- A local placeholder for CMS entries without an image.

`originals/` preserves the downloaded files. `images/` contains the WebP copies used on the site. `manifest.json` records source URLs, local paths, file sizes and SHA-256 checksums of originals. Source URLs are provenance only.

Deploy this folder together with the frontend. No database import is required for these additions. Homepage slides, logos, clinic maps and treatment-card photos already use local files and are retained.

`src/utils/publicImages.ts` also maps known old CMS image URLs to these local copies; unrelated custom uploads remain unchanged. The 52 gallery photos and gallery cover are stored separately under `public/gallery/`.

The full original archive is excluded from service-worker precaching. Video playback still uses YouTube; maps and social links retain their existing behavior. New videos outside this archive use their normal YouTube thumbnail until archived separately.
