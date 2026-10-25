export const PUBLIC_PATHS = {
  home: '/',
  about: '/about-us',
  treatments: '/treatments',
  gallery: '/gallery',
  media: '/media',
  awards: '/awards',
  video: '/video',
  contact: '/contact-us',
  booking: '/booking',
} as const;

export const PUBLIC_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/home', to: PUBLIC_PATHS.home },
  { from: '/about', to: PUBLIC_PATHS.about },
  { from: '/contact', to: PUBLIC_PATHS.contact },
  { from: '/gallery/media', to: PUBLIC_PATHS.media },
  { from: '/gallery/awards', to: PUBLIC_PATHS.awards },
  { from: '/gallery/video', to: PUBLIC_PATHS.video },
];
