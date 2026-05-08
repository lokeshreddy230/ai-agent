import { NextResponse } from 'next/server';
import { getOAuth2Client } from '../../../../lib/google-auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const origin = url.origin;
    
    if (!code) {
      return NextResponse.redirect(`${origin}/?auth=error&message=NoCode`);
    }

    const oAuth2Client = getOAuth2Client(origin);
    const { tokens } = await oAuth2Client.getToken(code);
    
    // Set token in HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('gmail_oauth_token', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return NextResponse.redirect(`${origin}/?auth=success`);
  } catch (error) {
    console.error('Callback route error:', error);
    const url = new URL(request.url);
    return NextResponse.redirect(`${url.origin}/?auth=error`);
  }
}
