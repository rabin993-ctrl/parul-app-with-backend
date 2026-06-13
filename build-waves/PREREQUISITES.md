# PREREQUISITES — one-time setup (Linux, terminal-first)

Do this **before Wave 0**. Almost everything is terminal; only **two** steps need a browser (creating
a Supabase access token, and — optionally — Google OAuth credentials). Run commands from the repo
root: `~/Projects/pet-adoption/parul-app`.

> Legend: 🖥️ = terminal · 🌐 = browser (unavoidable)

---

## 0. Tooling 🖥️

```bash
# Node 20+ and npm (check)
node -v        # need >= 20
npm -v

# If Node is too old, install via nvm:
#   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
#   exec $SHELL && nvm install 20 && nvm use 20

# Supabase CLI — install as a dev dependency (supported on Linux; use via npx)
npm i -D supabase
npx supabase --version

# Expo / EAS CLI (for builds later) — used via npx, no global install needed
npx expo --version || true

# git identity (if not set)
git config user.name  >/dev/null || git config user.name  "Your Name"
git config user.email >/dev/null || git config user.email "you@example.com"
```

---

## 1. Supabase account + access token 🌐 (the one required browser step)

1. Create a free account at **https://supabase.com** (GitHub login is fine).
2. Create a **Personal Access Token**: https://supabase.com/dashboard/account/tokens → *Generate new
   token* → copy it.

Then back in the terminal 🖥️:

```bash
export SUPABASE_ACCESS_TOKEN="paste-your-token-here"
# persist it for this project (don't commit):
echo 'SUPABASE_ACCESS_TOKEN=paste-your-token-here' >> .env.local
```

> Everything from here is terminal-only.

---

## 2. Create the Supabase project 🖥️

```bash
# find your org id
npx supabase orgs list
# -> note the ID column for your org, e.g. abcd1234

# create the project (Bangladesh-first: ap-south-1 = Mumbai, nearest region)
# pick a strong DB password and SAVE it.
npx supabase projects create parul \
  --org-id <ORG_ID> \
  --region ap-south-1 \
  --db-password '<STRONG_DB_PASSWORD>'

# list to get the project ref (the part before .supabase.co)
npx supabase projects list
# -> note REFERENCE ID, e.g. abcdefghijklmnop
```

Get your API keys and URL 🖥️:

```bash
npx supabase projects api-keys --project-ref <PROJECT_REF>
# -> copy the "anon" key (public) and the "service_role" key (secret)
# Project URL is: https://<PROJECT_REF>.supabase.co
```

---

## 3. Link the repo & init Supabase 🖥️

```bash
npx supabase init          # creates supabase/ (config.toml, etc.) — say yes
npx supabase link --project-ref <PROJECT_REF>
# enter the DB password from step 2 when asked
```

---

## 4. App environment file 🖥️

```bash
cat > .env <<'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
EOF

# make sure secrets aren't committed
grep -qxF '.env' .gitignore || echo '.env' >> .gitignore
grep -qxF '.env.local' .gitignore || echo '.env.local' >> .gitignore
```

> The **anon key** is safe in the client (RLS protects data). **Never** put the `service_role` key in
> the app — it's only used by Edge Functions / the CLI.

---

## 5. Auth config for launch (email now, OTP later) 🖥️

For a fast beta, start with **email/password** and disable email confirmation (so testers can log in
without an SMTP server). Edit `supabase/config.toml`:

```toml
[auth]
site_url = "http://localhost:8081"
additional_redirect_urls = ["http://localhost:8081", "https://<your-droplet-domain>"]

[auth.email]
enable_signup = true
enable_confirmations = false   # beta: no SMTP needed. Turn on before public launch.
```

Push config when you start Wave 0: `npx supabase config push` (or apply via the dashboard if a key
isn't CLI-settable on your CLI version).

> **Phone OTP is deferred to Phase 2** — leave phone auth off.

---

## 6. (Optional) Google OAuth 🌐 + 🖥️

You can launch with email-only and add this later. To enable Google sign-in:

1. 🌐 Google Cloud Console → create an **OAuth 2.0 Client ID** (Web application). Authorized redirect
   URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. Copy the **Client ID** + **Secret**.
2. 🖥️ Add to `supabase/config.toml`:
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "env(GOOGLE_CLIENT_ID)"
   secret = "env(GOOGLE_SECRET)"
   ```
   ```bash
   echo 'GOOGLE_CLIENT_ID=...' >> .env.local
   echo 'GOOGLE_SECRET=...'    >> .env.local
   npx supabase config push
   ```

---

## 7. (For Wave 7 deploy) Droplet + domain 🖥️/🌐

Have ready before Wave 7:
- A DigitalOcean **droplet** (Ubuntu 22.04+, smallest size is fine) with SSH access.
- A **domain/subdomain** with a DNS **A record** pointing to the droplet IP (e.g. `app.parul.xyz`).
- A **Cloudflare account (free)** with your domain added, so Wave 7 can put Cloudflare's CDN in front
  of Supabase Storage (e.g. a `cdn.<your-domain>` record → Storage origin). This is what keeps image
  bandwidth — the free tier's first real limit — cheap. Easiest if your domain's nameservers are on
  Cloudflare; have the dashboard handy (adding the CDN hostname is the one browser step here).

One-time droplet bootstrap (run over SSH; Wave 7 automates the rest) 🖥️:

```bash
ssh root@<DROPLET_IP>

# install Caddy (automatic HTTPS) — Debian/Ubuntu
apt update && apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
mkdir -p /var/www/parul
exit
```

Wave 7 will build the Expo web bundle, copy `dist/` to `/var/www/parul`, and write a `Caddyfile`
that serves it with HTTPS for your domain.

---

## 8. Verify prerequisites 🖥️

```bash
# app deps installed
npm install

# supabase linked
npx supabase projects list | grep <PROJECT_REF> && echo "LINKED OK"

# env present
test -f .env && grep -q EXPO_PUBLIC_SUPABASE_URL .env && echo "ENV OK"

# app still boots (Ctrl-C to stop)
npm start
```

When all three print OK and the app boots, **you're ready for Wave 0**.

---

### Quick reference — values you'll reuse

| Value | Where to find it |
|-------|------------------|
| `PROJECT_REF` | `npx supabase projects list` |
| Project URL | `https://<PROJECT_REF>.supabase.co` |
| anon key | `npx supabase projects api-keys --project-ref <REF>` |
| service_role key | same command (**keep secret**) |
| Access token | dashboard → Account → Access Tokens |
| DB password | you set it in step 2 (save it!) |
