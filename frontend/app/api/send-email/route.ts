import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { getOAuth2Client } from '../../../lib/google-auth';

export async function POST(request: Request) {
  try {
    console.log("[API] /api/send-email triggered");
    const payload = await request.json();
    console.log("[API] Incoming payload:", payload);
    const { to, subject, draftReply, threadId, messageId, testMode } = payload;
    
    if (!to || !draftReply) {
      return NextResponse.json({
        error: "Missing required fields"
      }, { status: 400 });
    }

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('gmail_oauth_token');

    console.log("[OAuth] Token found:", !!tokenCookie);

    if (!tokenCookie || !tokenCookie.value) {
      return NextResponse.json({ status: "error", message: "OAuth session expired. Reconnect Gmail." }, { status: 401 });
    }

    const tokens = JSON.parse(tokenCookie.value);
    console.log("[OAuth Scopes]", tokens.scope);
    
    const url = new URL(request.url);
    const oAuth2Client = getOAuth2Client(url.origin);
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    console.log("[Gmail API] OAuth authenticated");

    let targetEmail = to;
    if (testMode) {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      targetEmail = profile.data.emailAddress;
      console.log(`[Safe Mode] Redirecting reply to self: ${targetEmail} (originally ${to})`);
    }

    // Ensure subject starts with Re: if it's a reply
    const finalSubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    const messageLines = [
      `To: ${targetEmail}`,
      `Subject: ${finalSubject}`,
      `Content-Type: text/html; charset=utf-8`
    ];
    console.log("[Gmail API] Building MIME message");

    if (messageId) {
      messageLines.push(`In-Reply-To: ${messageId}`);
      messageLines.push(`References: ${messageId}`);
    }

    messageLines.push('');
    messageLines.push(draftReply.replace(/\n/g, '<br>'));

    const rawMessage = messageLines.join('\r\n');
    console.log("[Gmail API] Generated MIME headers:\n" + messageLines.slice(0, messageLines.length - 2).join('\n'));
    console.log("[Gmail API] Sending message...");
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: threadId || undefined
      }
    });

    console.log(`[Gmail API] Reply sent successfully.`);
    return NextResponse.json({ 
      success: true, 
      messageId: res.data.id 
    });
  } catch (error: any) {
    console.error("[SEND ERROR]", error);
    let errorMessage = String(error);
    
    if (errorMessage.includes('insufficient authentication scopes') || errorMessage.includes('Insufficient Permission')) {
      errorMessage = "Missing gmail.send scope. Please disconnect and reconnect your Gmail.";
    } else if (errorMessage.includes('invalid_grant')) {
      errorMessage = "OAuth session expired. Please reconnect.";
    }

    return NextResponse.json({ status: "error", message: errorMessage }, { status: 500 });
  }
}
