# Executive OS Deployment Guide (Termux / Android)

This guide details how to deploy the full Executive OS stack natively onto an Android device using Termux and `proot-distro` (Ubuntu).

**MISSION:** Deploy a persistent autonomous AI operating system with an always-on intelligence platform and self-hosted executive assistant directly on your mobile device.

*Note: This server is NOT a traditional Ubuntu VPS. Standard VPS instructions (like Nginx, systemd) do not apply here.*

---

## 1. Install Ubuntu Inside Termux

Open your Termux app and run the following to install a full Ubuntu environment:

```bash
pkg update && pkg upgrade -y
pkg install proot-distro -y
proot-distro install ubuntu
```

---

## 2. Login to Ubuntu

```bash
proot-distro login ubuntu
```

---

## 3. Install System Packages

Inside the Ubuntu environment, install the necessary dependencies for building the app and running Puppeteer/Chromium:

```bash
apt update && apt upgrade -y

apt install -y \
  git \
  curl \
  wget \
  nano \
  build-essential \
  chromium-browser
```

---

## 4. Install Node.js

Install Node.js 20.x:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

---

## 5. Clone Project

```bash
git clone <repo-url>
cd frontend
```

---

## 6. Install Dependencies

```bash
npm install
```

---

## 7. Environment Variables

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

## 8. Puppeteer Config Fix

The codebase is already configured to detect your Linux environment and use the native `chromium-browser` executable. This is necessary because the bundled Puppeteer Chromium often fails inside native Termux/proot without heavy patching.

*The configuration in `lib/whatsapp.ts` looks like this:*
```javascript
puppeteer: {
  headless: true,
  executablePath: process.platform === 'linux' ? '/usr/bin/chromium-browser' : undefined,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ]
}
```

---

## 9. Start Application

Build and start the Next.js server:

```bash
npm run build
npm start
```

---

## 10. Optional: Keep Alive with PM2

To ensure the process stays alive in the background:

```bash
npm install -g pm2
pm2 start npm --name executive-os -- start
```

---

## 11. Final Verification

Your Executive OS should now run:
- [ ] Inside Ubuntu proot
- [ ] On an Android device
- [ ] With working Chromium
- [ ] With working WhatsApp automation
- [ ] With persistent memory (`memory.json`)
