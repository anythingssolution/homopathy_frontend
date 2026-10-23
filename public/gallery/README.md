# Clinic gallery archive

Photos and captions were archived from the clinic's original website:
https://test.businesswithinfinite.in/drtrivedi/

- Treatments: 15 images
- Media: 23 images
- Awards: 14 images
- Gallery cover: 1 image

`originals/` preserves the downloaded originals. `images/` contains optimized WebP files used by the site. `manifest.json` records the source pages, original captions, local paths, byte counts and SHA-256 checksums of the original files. Source URLs are provenance only; displaying these photos does not request the old website.

Deploy this folder with the frontend. Deploy `data/legacy-gallery.json` and `scripts/importLocalGallery.js` with the backend. In the backend directory run:

```
node scripts/importLocalGallery.js
node scripts/importLocalGallery.js --apply
```

The first command previews changes. The second imports missing photos into the existing CMS and replaces matching legacy image URLs with local paths. Repeating it skips already imported images and preserves CMS edits, visibility settings and existing videos. No tables are recreated or cleared.

The original files are excluded from service-worker precaching to avoid downloading the full archive to every visitor. YouTube videos continue to use the existing video service.
