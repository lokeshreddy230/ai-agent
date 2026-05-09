import { NextResponse } from 'next/server';
import { getAuthUrl } from '../../../../lib/google-auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = url.origin;
    
    // Clear old token to force re-consent with new scopes
    const cookieStore = await cookies();
    cookieStore.delete('gmail_oauth_token');
    
    const authUrl = getAuthUrl(origin);
    
    return NextResponse.json({ status: 'success', url: authUrl });
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
