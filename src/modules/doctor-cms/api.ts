import { 
  CmsHeroItem, 
  CmsTestimonialItem, 
  CmsGalleryItem, 
  HomepageCmsResponse 
} from './types';

const API_BASE_DOCTOR = '/api/v1/doctors/cms';
const API_BASE_PUBLIC = '/api/v1/public/cms';

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Helper for testimonials tags
export function normalizeTestimonial(item: any): CmsTestimonialItem {
  return {
    ...item,
    tags: Array.isArray(item.tags)
      ? item.tags
      : item.tags_json
        ? JSON.parse(item.tags_json)
        : [],
  };
}

// ----------------------------------------------------
// Public APIs
// ----------------------------------------------------

export async function getPublicHomepageCms(): Promise<{ success: boolean; data?: HomepageCmsResponse }> {
  try {
    const res = await fetch(`${API_BASE_PUBLIC}/homepage`);
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch public homepage CMS', error);
    return { success: false };
  }
}

export async function getPublicGalleryCms(): Promise<{ success: boolean; data?: CmsGalleryItem[] }> {
  try {
    const res = await fetch(`${API_BASE_PUBLIC}/gallery`);
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch public gallery CMS', error);
    return { success: false };
  }
}

// ----------------------------------------------------
// Combined Doctor CMS
// ----------------------------------------------------

export async function getDoctorHomepageCms(token: string): Promise<{ success: boolean; data?: HomepageCmsResponse }> {
  try {
    const res = await fetch(`${API_BASE_DOCTOR}/homepage`, {
      headers: authHeaders(token),
    });
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch doctor homepage CMS', error);
    return { success: false };
  }
}

// ----------------------------------------------------
// Hero CMS APIs
// ----------------------------------------------------

export async function getDoctorHeroCms(token: string) {
  const res = await fetch(`${API_BASE_DOCTOR}/hero`, { headers: authHeaders(token) });
  return res.json();
}

export async function createDoctorHeroCms(token: string, payload: Partial<CmsHeroItem>) {
  const res = await fetch(`${API_BASE_DOCTOR}/hero`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateDoctorHeroCms(token: string, id: number, payload: Partial<CmsHeroItem>) {
  const res = await fetch(`${API_BASE_DOCTOR}/hero/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteDoctorHeroCms(token: string, id: number) {
  const res = await fetch(`${API_BASE_DOCTOR}/hero/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return res.json();
}

// ----------------------------------------------------
// Testimonial CMS APIs
// ----------------------------------------------------

export async function getDoctorTestimonialCms(token: string) {
  const res = await fetch(`${API_BASE_DOCTOR}/testimonials`, { headers: authHeaders(token) });
  return res.json();
}

export async function createDoctorTestimonialCms(token: string, payload: Partial<CmsTestimonialItem>) {
  const res = await fetch(`${API_BASE_DOCTOR}/testimonials`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateDoctorTestimonialCms(token: string, id: number, payload: Partial<CmsTestimonialItem>) {
  const res = await fetch(`${API_BASE_DOCTOR}/testimonials/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteDoctorTestimonialCms(token: string, id: number) {
  const res = await fetch(`${API_BASE_DOCTOR}/testimonials/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return res.json();
}

// ----------------------------------------------------
// Gallery CMS APIs
// ----------------------------------------------------

export async function getDoctorGalleryCms(token: string) {
  const res = await fetch(`${API_BASE_DOCTOR}/gallery`, { headers: authHeaders(token) });
  return res.json();
}

export async function createDoctorGalleryCms(token: string, payload: Partial<CmsGalleryItem>) {
  const res = await fetch(`${API_BASE_DOCTOR}/gallery`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateDoctorGalleryCms(token: string, id: number, payload: Partial<CmsGalleryItem>) {
  const res = await fetch(`${API_BASE_DOCTOR}/gallery/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteDoctorGalleryCms(token: string, id: number) {
  const res = await fetch(`${API_BASE_DOCTOR}/gallery/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return res.json();
}
