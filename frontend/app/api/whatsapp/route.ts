import { NextResponse } from 'next/server';
import { getWhatsAppClient, getWhatsAppStatus, getRecentWhatsAppMessages, sendWhatsAppMessage, logoutWhatsApp } from '../../../lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = getWhatsAppStatus();
    const messages = getRecentWhatsAppMessages();
    return NextResponse.json({ ...status, messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, to, message } = body;
    
    if (action === 'start') {
      getWhatsAppClient(); // Initialize client
      return NextResponse.json({ success: true, message: "WhatsApp client initializing" });
    } else if (action === 'send') {
      await sendWhatsAppMessage(to, message);
      return NextResponse.json({ success: true, message: "Message sent" });
    } else if (action === 'logout') {
      await logoutWhatsApp();
      return NextResponse.json({ success: true, message: "WhatsApp session disconnected" });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
