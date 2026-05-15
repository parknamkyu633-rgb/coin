import axios from 'axios';
import { getOrCreateDeviceId } from './device';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const deviceId = await getOrCreateDeviceId();
  config.headers['X-Device-ID'] = deviceId;
  return config;
});

export async function scanCoin(frontUri: string, backUri?: string) {
  const form = new FormData();
  form.append('front', { uri: frontUri, name: 'front.jpg', type: 'image/jpeg' } as never);
  if (backUri) {
    form.append('back', { uri: backUri, name: 'back.jpg', type: 'image/jpeg' } as never);
  }
  const { data } = await api.post('/api/scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getScans() {
  const { data } = await api.get('/api/scans');
  return data;
}

export async function deleteScan(id: string) {
  await api.delete(`/api/scan/${id}`);
}

export async function getListings(params?: Record<string, string>) {
  const { data } = await api.get('/api/listings', { params });
  return data;
}

export async function uploadImages(uris: string[]): Promise<string[]> {
  const form = new FormData();
  uris.forEach((uri, i) => {
    const ext = uri.split('.').pop() ?? 'jpg';
    form.append('file', { uri, name: `image_${i}.${ext}`, type: 'image/jpeg' } as never);
  });
  const { data } = await api.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.urls as string[];
}

export async function createListing(payload: {
  title: string;
  price: number;
  description?: string;
  scanId?: string;
  imageUrls: string[];
}) {
  const { data } = await api.post('/api/listings', payload);
  return data;
}
