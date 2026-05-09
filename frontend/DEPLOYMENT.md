# Executive OS Deployment Guide (Custom Server / VPS)

This guide details how to deploy the full Executive OS stack onto your own VPS/server instead of Vercel.

**MISSION:** Deploy a persistent autonomous AI operating system with an always-on intelligence platform and self-hosted executive assistant.

The deployment supports:
- Next.js frontend & API routes
- WhatsApp automation (Puppeteer & whatsapp-web.js)
- Persistent memory
- Gmail OAuth
- SSE streaming
- Autonomous agents

## Server Requirements
- **OS:** Ubuntu 22.04
- **Runtime:** Node.js 20+
- **Process Manager:** PM2
- **Web Server:** Nginx
- **Security:** SSL (HTTPS)
- **VCS:** Git

---

## 1. Clone Repository

```bash
git clone <repo-url>
cd frontend
```

---

## 2. Install Node Dependencies

```bash
npm install
```

---

## 3. Install Chrome Dependencies for WhatsApp

WhatsApp-web.js requires a headless Chromium instance to operate. Install the necessary system dependencies:

```bash
sudo apt update

sudo apt install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2t64 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  wget
```

---

## 4. Environment Variables

Create your environment file:

```bash
nano .env.local
```

Add your credentials:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GROQ_API_KEY=
TAVILY_API_KEY=
APIFY_API_TOKEN=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

---

## 5. Build Next.js App

```bash
npm run build
```

---

## 6. Start Using PM2

PM2 will keep the Next.js server alive in the background and automatically restart it on failure.

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name executive-os -- start

# Save the PM2 process list and configure it to start on boot
pm2 save
pm2 startup
```

---

## 7. Nginx Reverse Proxy

Configure Nginx to route traffic to the Next.js server and handle SSE (Server-Sent Events) streaming correctly.

Create the Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/executive-os
```

Add the following configuration:

```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/executive-os /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. Enable HTTPS

Secure the dashboard with SSL via Let's Encrypt.

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate and apply SSL certificates
sudo certbot --nginx -d your-domain.com
```

---

## 9. WhatsApp Session Persistence

Ensure that the `.whatsapp-session` folder and `memory.json` file are persisting across restarts.
PM2 will not wipe these directories, allowing the WhatsApp QR login and autonomous context memory to survive server restarts.

---

## 10. Puppeteer Server Mode

Inside `lib/whatsapp.ts`, Puppeteer is already configured with the correct flags for a headless Linux environment:

```javascript
puppeteer: {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
}
```
*Note: This configuration prevents sandbox-related crashes when running as root or a restricted user on Ubuntu.*

---

## 11. Firewall Configuration

Expose the necessary web ports while keeping the internal Next.js port (3000) private.

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## 12. Final Verification

Access your domain `https://your-domain.com` and verify the following:

- [ ] Gmail OAuth login works
- [ ] WhatsApp QR login successfully generates and authenticates
- [ ] SSE streaming successfully populates the dashboard
- [ ] Autonomous replies dispatch correctly
- [ ] Memory persists after executing a PM2 restart (`pm2 restart executive-os`)
- [ ] HTTPS lock icon appears correctly on your domain
