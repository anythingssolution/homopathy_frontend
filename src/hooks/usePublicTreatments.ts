import { useEffect, useMemo, useState } from 'react';
import { getPublicTreatmentsCms } from '../modules/doctor-cms/api';
import type { CmsTreatmentItem } from '../modules/doctor-cms/types';
import {
  treatmentsData,
  type TreatmentItem,
} from '../data/treatmentsData';

export function mapCmsTreatment(item: CmsTreatmentItem): TreatmentItem {
  return {
    id: item.slug,
    en: item.title_en,
    hi: item.title_hi || item.title_en,
    category: item.category || 'Specialty',
    description: item.description,
    image: item.image_url,
    remedies: item.remedies,
    seoTitle: item.seo_title,
    seoDescription: item.seo_description,
    source: 'cms',
  };
}

export function mergeTreatments(cmsItems: CmsTreatmentItem[], cmsReady: boolean): TreatmentItem[] {
  if (cmsReady) return cmsItems.map(mapCmsTreatment);
  return treatmentsData;
}

export function usePublicTreatments() {
  const [cmsItems, setCmsItems] = useState<CmsTreatmentItem[]>([]);
  const [cmsReady, setCmsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPublicTreatmentsCms().then((res) => {
      if (cancelled) return;
      if (res.success && Array.isArray(res.data)) {
        setCmsItems(res.data);
        setCmsReady(true);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const treatments = useMemo(() => mergeTreatments(cmsItems, cmsReady), [cmsItems, cmsReady]);

  return { treatments, isLoading, cmsReady };
}
