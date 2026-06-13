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

## 5. Auth config — ✅ already done for you (in `supabase/config.toml`)

This is already set in the committed `supabase/config.toml`:

```toml
[auth]
site_url = "https://parul.pet"
additional_redirect_urls = ["https://parul.pet", "https://parul.pet/**", "https://www.parul.pet",
                            "http://localhost:8081", "http://localhost:8081/**", "parul://**"]

[auth.email]
enable_signup = true
enable_confirmations = false   # beta: no SMTP needed. Turn on before public launch.
```

These values live in `config.toml` (which drives local dev) but the **remote** hosted project still
defaults email confirmations **ON**. To apply this config to the remote project, after you link
(step 3) run **once**:

```bash
npx supabase config push      # pushes [auth] settings to the linked remote project
```

Or do it in 30s in the dashboard: **Authentication → URL Configuration** (set Site URL `https://parul.pet`
+ the redirect URLs) and **Authentication → Providers → Email** (turn **Confirm email OFF** for beta).

> **Phone OTP is deferred to Phase 2** — phone auth stays off. Google OAuth is optional (§6).

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

## 7. Domain (parul.pet) + Cloudflare + Droplet  🌐/🖥️  (needed for Wave 7 deploy)

Three pieces: **(7a)** put `parul.pet` on Cloudflare and point the web app at your droplet;
**(7b)** prep the droplet to serve the web build; **(7c)** put a Cloudflare CDN in front of Supabase
Storage so image bandwidth stays cheap. You can do 7a–7b now and 7c around Wave 7.

### 7a. Add parul.pet to Cloudflare + DNS  🌐
1. Create a free **Cloudflare** account → **Add a site** → `parul.pet`.
2. Cloudflare shows two **nameservers**. Go to your domain registrar and **replace the nameservers**
   with Cloudflare's. (Propagates in minutes–hours.)
3. In Cloudflare **DNS → Records**, add:

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | `A` | `parul.pet` (`@`) | `<DROPLET_IP>` | **DNS only** (grey cloud) |
   | `CNAME` | `www` | `parul.pet` | DNS only |

   > **DNS only (grey cloud) for the apex is important** — it lets Caddy on the droplet obtain a
   > Let's Encrypt certificate directly so HTTPS "just works." (You can switch to proxied later with a
   > Cloudflare Origin Certificate.) The `cdn` subdomain in 7c is the part that gets Cloudflare's CDN.

### 7b. Droplet bootstrap (SSH)  🖥️
You said you have SSH to the droplet. Install Caddy (automatic HTTPS):

```bash
ssh root@<DROPLET_IP>

apt update && apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
mkdir -p /var/www/parul
exit
```

The `Caddyfile` (already prepared for `parul.pet` at `scripts/Caddyfile.example`) is installed by
Wave 7, which builds the web bundle and runs `DROPLET_HOST=<DROPLET_IP> npm run deploy:web`.

### 7c. Cloudflare CDN for Supabase Storage — `cdn.parul.pet`  🖥️ (mostly terminal)
This is what keeps the free tier's egress limit from biting. A tiny **Cloudflare Worker** proxies and
**caches** public Storage images at the edge, so repeat views don't re-bill Supabase. It maps
`https://cdn.parul.pet/<bucket>/<path>` → your project's public Storage URL — which is exactly what
`src/lib/cdn.ts` expects.

```bash
# from repo root — wrangler is Cloudflare's CLI
npm i -D wrangler
npx wrangler login            # one-time browser auth

mkdir -p cloudflare/parul-cdn/src
cat > cloudflare/parul-cdn/wrangler.toml <<'TOML'
name = "parul-cdn"
main = "src/worker.js"
compatibility_date = "2024-11-01"
# auto-provisions the custom domain + DNS + cert (parul.pet must be on Cloudflare — step 7a)
routes = [{ pattern = "cdn.parul.pet", custom_domain = true }]
TOML

cat > cloudflare/parul-cdn/src/worker.js <<'JS'
// cdn.parul.pet/<bucket>/<path>  ->  Supabase Storage public object (cached at Cloudflare edge)
const SUPABASE = 'https://zoezppkypxogylwypdwu.supabase.co';
export default {
  async fetch(req, ctx) {
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return new Response('Method Not Allowed', { status: 405 });
    const url = new URL(req.url);
    const origin = `${SUPABASE}/storage/v1/object/public${url.pathname}${url.search}`;
    const cache = caches.default;
    const hit = await cache.match(req);
    if (hit) return hit;
    let res = await fetch(origin, { cf: { cacheEverything: true, cacheTtl: 86400 } });
    res = new Response(res.body, res);
    res.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=2592000, immutable');
    res.headers.set('Access-Control-Allow-Origin', '*');
    ctx.waitUntil(cache.put(req, res.clone()));
    return res;
  },
};
JS

cd cloudflare/parul-cdn && npx wrangler deploy && cd -
```

Then point the app at the CDN (public images only; private/signed URLs still go direct to Supabase):

```bash
# add to .env
echo 'EXPO_PUBLIC_CDN_URL=https://cdn.parul.pet' >> .env
```

Verify after deploy: `curl -I https://cdn.parul.pet/<bucket>/<somefile>` → after the first request,
repeat requests show `cf-cache-status: HIT`. (You'll have real files to test once Wave 2 uploads media.)

> Don't have images yet? Fine — set up 7c now, the URL just 404s until Storage has objects. The app's
> `cdn.ts` already falls back to the direct Supabase URL when `EXPO_PUBLIC_CDN_URL` is empty, so
> nothing breaks if you defer 7c to Wave 7.

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
