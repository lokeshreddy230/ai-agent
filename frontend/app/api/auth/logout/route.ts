import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('gmail_oauth_token');
  return NextResponse.json({ status: 'success', message: 'Logged out successfully' });
}
