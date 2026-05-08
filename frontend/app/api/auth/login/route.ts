import { NextResponse } from 'next/server';
import { getAuthUrl } from '../../../../lib/google-auth';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = url.origin;
    
    const authUrl = getAuthUrl(origin);
    
    return NextResponse.json({ status: 'success', url: authUrl });
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
