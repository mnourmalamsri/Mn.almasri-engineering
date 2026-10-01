import { pbkdf2Sync, randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function assert(value, status, message) { if (!value) throw new HttpError(status, message); }
export function text(value, label, max = 160, required = true) {
  assert(typeof value === 'string' || (!required && value == null), 400, `${label}: قيمة غير صالحة`);
  const result = (value || '').trim();
  assert((!required || result.length > 0) && result.length <= max, 400, `${label}: مطلوب وبحد أقصى ${max} حرفًا`);
  return result;
}
export function password(value) {
  assert(typeof value === 'string' && value.length >= 6 && value.length <= 128, 400, 'كلمة المرور يجب أن تكون بين 6 و128 حرفًا');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${pbkdf2Sync(value, salt, 600000, 32, 'sha256').toString('hex')}`;
}
export function verifyPassword(value, stored) {
  if (typeof value !== 'string' || value.length > 128 || !stored) return false;
  const [salt, hash] = stored.split(':');
  const calculated = pbkdf2Sync(value, salt, 600000, 32, 'sha256');
  return equal(calculated.toString('hex'), hash);
}
export function equal(a, b) {
  const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || ''));
  return x.length === y.length && timingSafeEqual(x, y);
}
export const digest = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('hex');
export function admin(user) { assert(user?.role === 'admin', 403, 'هذه العملية متاحة للمدير فقط'); }
export function location(value = {}) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 400, 'الموقع غير صالح');
  const address = text(value.address, 'العنوان', 300, false);
  if (value.lat == null || value.lat === '') {
    assert(value.lng == null || value.lng === '', 400, 'أدخل خط العرض والطول معًا');
    return { address, lat: null, lng: null };
  }
  assert(value.lng !== '' && value.lng != null, 400, 'أدخل خط العرض والطول معًا');
  const lat = Number(value.lat), lng = Number(value.lng);
  assert(Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180, 400, 'إحداثيات الموقع غير صالحة');
  return { address, lat, lng };
}
export function visibleUser(user) {
  const { passwordHash, ...safe } = user; return safe;
}
export function cookie(request, value, maxAge = 43200) {
  return `engineering_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function getToken(request) {
  return (request.headers.get('cookie') || '').match(/(?:^|;\s*)engineering_session=([a-f0-9]{64})(?:;|$)/)?.[1];
}
export const headers = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY', 'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
  'Cache-Control': 'no-store'
};
