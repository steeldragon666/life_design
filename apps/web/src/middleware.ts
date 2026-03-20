import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasBillingAccess, requiresBillingGate } from '@/lib/stripe';
import { isAssetOrInternalPath, isGuestProtectedPath, isPublicGuestPath } from '@/lib/route-guard';

const GUEST_ONBOARDED_COOKIE = 'life-design-guest-onboarded';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });
  response.headers.set('x-pathname', pathname);

  if (isAssetOrInternalPath(pathname)) {
    return response;
  }

  const isGuestProtected = !isPublicGuestPath(pathname) && isGuestProtectedPath(pathname);
  const requiresBilling = requiresBillingGate(pathname) && !pathname.startsWith('/paywall');
  if (!isGuestProtected && !requiresBilling) {
    return response;
  }

  // Guest-first safe defaults: if auth or billing is unavailable, we do not block app usage.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof response.cookies.set>[2] }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (isGuestProtected && request.cookies.get(GUEST_ONBOARDED_COOKIE)?.value !== '1') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // For authenticated users accessing protected routes, check onboarding status
  if (isGuestProtected && pathname !== '/onboarding') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_status')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && profile.onboarding_status !== 'completed') {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  if (!requiresBilling) {
    return response;
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('status, trial_end, current_period_end, lifetime_access')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    return response;
  }

  // Only enforce gate when a billing record exists; otherwise keep legacy access functional.
  if (!subscription) {
    return response;
  }

  if (!hasBillingAccess(subscription)) {
    const redirectUrl = new URL('/paywall', request.url);
    redirectUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
