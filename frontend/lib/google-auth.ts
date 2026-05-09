import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify"
];

export function getOAuth2Client(origin: string) {
  const credentialsPath = path.join(process.cwd(), 'credentials.json');
  let client_id, client_secret;
  
  if (fs.existsSync(credentialsPath)) {
    const credentialsStr = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsStr);
    const creds = credentials.installed || credentials.web;
    client_id = creds.client_id;
    client_secret = creds.client_secret;
  } else {
    // Fallback to env vars if file is missing (e.g. on Vercel)
    client_id = process.env.GOOGLE_CLIENT_ID;
    client_secret = process.env.GOOGLE_CLIENT_SECRET;
  }

  // Use dynamic origin for the callback URL so it works both locally and on Vercel
  const redirect_uri = `${origin}/api/auth/callback`;

  return new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  );
}

export function getAuthUrl(origin: string) {
  const oAuth2Client = getOAuth2Client(origin);
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}
