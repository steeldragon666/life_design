const PUBLIC_GUEST_PREFIXES = ['/login', '/signup', '/onboarding', '/paywall', '/pricing'];
const PROTECTED_GUEST_PREFIXES = [
  '/dashboard',
  '/goals',
  '/checkin',
  '/mentors',
  '/insights',
  '/profile',
  '/settings',
  '/meditations',
  '/future-self',
  '/rituals',
];

export function isAssetOrInternalPath(pathname: string): boolean {
  if (!pathname) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api/')) return true;
  if (pathname === '/favicon.ico') return true;
  return /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$/i.test(pathname);
}

export function isPublicGuestPath(pathname: string): boolean {
  return PUBLIC_GUEST_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isGuestProtectedPath(pathname: string): boolean {
  return PROTECTED_GUEST_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
