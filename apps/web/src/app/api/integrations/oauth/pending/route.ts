import { NextRequest, NextResponse } from 'next/server';

const OAUTH_PENDING_COOKIE_BY_PROVIDER: Record<string, string> = {
  linkedin: 'life-design-oauth-linkedin',
  strava: 'life-design-oauth-strava',
  google: 'life-design-oauth-google',
  spotify: 'life-design-oauth-spotify',
  slack: 'life-design-oauth-slack',
  notion: 'life-design-oauth-notion',
  instagram: 'life-design-oauth-instagram',
};

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider') ?? '';
  const cookieName = OAUTH_PENDING_COOKIE_BY_PROVIDER[provider];
  if (!cookieName) {
    return NextResponse.json({ token: null }, { status: 400 });
  }

  const clearPendingCookie = (response: NextResponse) => {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  };

  const rawToken = request.cookies.get(cookieName)?.value;

  if (!rawToken) {
    return clearPendingCookie(NextResponse.json({ token: null }));
  }

  try {
    const decoded = Buffer.from(rawToken, 'base64url').toString('utf8');
    const token = JSON.parse(decoded) as Record<string, unknown>;
    return clearPendingCookie(NextResponse.json({ token }));
  } catch {
    return clearPendingCookie(NextResponse.json({ token: null }));
  }
}
