import React from 'react';
import { Facebook, Instagram, MapPin, Youtube, Users, Stethoscope, Ellipsis, type LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  FACEBOOK: Facebook, INSTAGRAM: Instagram, GOOGLE: MapPin, YOUTUBE: Youtube,
  FAMILY_FRIEND: Users, DOCTOR: Stethoscope, OTHER: Ellipsis,
};

export default function DiscoverySourceIcon({ code, size = 19, className = '' }: {
  code: string; size?: number; className?: string;
}) {
  const Icon = icons[code] || Ellipsis;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" className={className}/>;
}
