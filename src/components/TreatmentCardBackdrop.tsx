import React from 'react';
import imageTints from '../data/treatmentImageTints.json';

const palettes: Record<string, number[][]> = imageTints;

// Precomputed from local image edges: no canvas work or extra image downloads in the browser.
export default function TreatmentCardBackdrop({ image }: { image?: string }) {
  const colours = image ? palettes[image] : null;
  if (!colours) return null;
  const colour = (index: number, alpha: number) => `rgba(${colours[index].join(',')},${alpha})`;
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
    <div className="absolute -inset-8 blur-2xl" style={{ background: [
      `radial-gradient(ellipse at 0% 0%, ${colour(0, .7)}, transparent 65%)`,
      `radial-gradient(ellipse at 100% 0%, ${colour(1, .7)}, transparent 65%)`,
      `radial-gradient(ellipse at 0% 100%, ${colour(2, .5)}, transparent 70%)`,
      `radial-gradient(ellipse at 100% 100%, ${colour(3, .5)}, transparent 70%)`,
    ].join(',') }}/>
    <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/65 to-white/70"/>
  </div>;
}
