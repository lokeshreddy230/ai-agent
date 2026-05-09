import fs from 'fs';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';

import QRCode from 'qrcode';

// Prevent multiple instances in Next.js development (hot reloading)
declare global {
  var _whatsappClient: Client | undefined;
  var _whatsappStatus: 'disconnected' | 'qr' | 'ready' | 'initializing';
  var _whatsappQrCode: string | undefined;
  var _whatsappMessages: any[];
}

if (!global._whatsappMessages) {
  global._whatsappMessages = [];
}

export const getWhatsAppClient = () => {
  if (global._whatsappClient) {
    return global._whatsappClient;
  }

  console.log('[WhatsApp Engine] Initializing new client...');
  global._whatsappStatus = 'initializing';
  
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(process.cwd(), '.whatsapp-session') }),
    puppeteer: {
      headless: true,
      executablePath: process.platform === 'linux' ? '/usr/bin/chromium-browser' : undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });

  client.on('qr', async (qr) => {
    console.log('[WhatsApp] QR generated');
    qrcode.generate(qr, { small: true });
    global._whatsappStatus = 'qr';
    try {
      global._whatsappQrCode = await QRCode.toDataURL(qr);
    } catch (err) {
      console.error('[WhatsApp Engine] Failed to generate base64 QR', err);
    }
  });

  client.on('ready', () => {
    console.log('[WhatsApp] Client ready');
    global._whatsappStatus = 'ready';
    global._whatsappQrCode = undefined;
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Authentication successful');
  });

  client.on('auth_failure', msg => {
    console.error('[WhatsApp Engine] AUTHENTICATION FAILURE', msg);
    global._whatsappStatus = 'disconnected';
  });

  client.on('message', async msg => {
    console.log(`[WhatsApp Engine] Message received from ${msg.from}: ${msg.body}`);
    try {
      const contact = await msg.getContact();
      global._whatsappMessages.unshift({
        id: msg.id._serialized,
        from: msg.from,
        senderName: contact.name || contact.pushname || msg.from,
        body: msg.body,
        timestamp: new Date(msg.timestamp * 1000).toISOString(),
        isGroup: msg.from.includes('@g.us'),
      });
      
      // Keep only last 100 messages
      if (global._whatsappMessages.length > 100) {
         global._whatsappMessages.pop();
      }
    } catch (e) {
      console.error("[WhatsApp Engine] Error fetching contact details", e);
    }
  });

  client.initialize().catch(err => {
    console.error('[WhatsApp Engine] Initialization error:', err);
    global._whatsappStatus = 'disconnected';
  });

  global._whatsappClient = client;
  return client;
};

export const getWhatsAppStatus = () => {
  return {
    status: global._whatsappStatus || 'disconnected',
    qrCode: global._whatsappQrCode,
    messageCount: global._whatsappMessages?.length || 0
  };
};

export const getRecentWhatsAppMessages = () => {
  return global._whatsappMessages || [];
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
   if (!global._whatsappClient || global._whatsappStatus !== 'ready') {
      throw new Error("WhatsApp client not ready");
   }
   await global._whatsappClient.sendMessage(to, message);
   return true;
};

export const logoutWhatsApp = async () => {
  try {
    if (global._whatsappClient) {
      if (global._whatsappStatus === 'ready') {
        console.log('[WhatsApp] Logging out...');
        await global._whatsappClient.logout();
      }
      console.log('[WhatsApp] Destroying client...');
      await global._whatsappClient.destroy();
    }
  } catch (error) {
    console.error('[WhatsApp] Error during client teardown:', error);
  }

  const sessionPath = path.join(process.cwd(), '.whatsapp-session');
  if (fs.existsSync(sessionPath)) {
    console.log('[WhatsApp] Deleting session cache...');
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }

  // Reset state
  global._whatsappClient = undefined;
  global._whatsappStatus = 'disconnected';
  global._whatsappQrCode = undefined;
  global._whatsappMessages = [];
  
  return true;
};
