# OAuth / API key setup for MVP channels (Postiz Docker)

MVP: **Bluesky**, **LinkedIn**, **Mastodon**, **Dev.to**, **Hashnode**

Secrets live in `postiz-local/.env` (gitignored). Compose reads them automatically.

```powershell
cd postiz-local
copy .env.example .env
# edit .env with LinkedIn + Mastodon keys (blog platforms use per-user API keys in Indie Takeoff)
docker compose up -d
```

Local redirect base: `http://localhost:5000`

Indie Takeoff → Social → Channels → Connect → finish → Refresh.

Official guides: https://docs.postiz.com/providers/overview

---

## 1. Bluesky (no developer keys)

Connect in Indie Takeoff → Channels → Bluesky (handle + app password).

Create an app password: Bluesky → Settings → Privacy and security → App Passwords.

---

## 2. LinkedIn

Docs: https://docs.postiz.com/providers/linkedin  
Portal: https://www.linkedin.com/developers/apps

1. Create a new app (company page required).
2. Products: **Share on LinkedIn** + **Sign In with LinkedIn using OpenID Connect**.
3. Auth → Authorized redirect URL:

   `http://localhost:5000/integrations/social/linkedin`

4. Put Client ID / Secret in `postiz-local/.env`:

   ```env
   LINKEDIN_CLIENT_ID=...
   LINKEDIN_CLIENT_SECRET=...
   ```

5. `docker compose up -d --force-recreate postiz`

Compose applies a startup patch so personal LinkedIn OAuth works. LinkedIn **Pages** still need Community Management API.

---

## 3. Mastodon

Docs: https://docs.postiz.com/providers/mastodon

Mastodon has no web UI for creating OAuth apps — register via API on the instance you use (default `mastodon.social`):

```powershell
curl.exe -X POST -sS "https://mastodon.social/api/v1/apps" `
  -F "client_name=IndieTakeoffLocal" `
  -F "redirect_uris=http://localhost:5000/integrations/social/mastodon" `
  -F "scopes=write:statuses write:media profile"
```

Put the returned values in `postiz-local/.env`:

```env
MASTODON_CLIENT_ID=...
MASTODON_CLIENT_SECRET=...
MASTODON_URL=https://mastodon.social
```

Then `docker compose up -d --force-recreate postiz`.

Connect in Indie Takeoff → Channels → Mastodon (OAuth popup).

To use a different instance, change `MASTODON_URL` and register the app on that instance instead.

---

## 4. Dev.to (API key — no Docker env)

1. Dev.to → Settings → Extensions → **DEV Community API Keys** → generate.
2. Indie Takeoff → Channels → Connect Dev.to → paste key.

Compose needs an **article title**; tags optional (max 4). Content is Markdown.

---

## 5. Hashnode (API key — no Docker env)

**Requires Hashnode Pro** on the publication for GraphQL API access (reads/writes). Free-tier PATs can be created but will fail connect/publish.

1. Upgrade the publication: Hashnode dashboard → **Billing** → Upgrade to Pro.
2. Account → Developer → **Personal Access Token**.
3. Indie Takeoff → Channels → Connect Hashnode → paste token.
4. When composing: **title** (6+ chars), **publication** (from dropdown or paste ID), **at least one tag**.

Content is Markdown. First attached image is used as cover when present.

---

## Checklist

- [ ] `postiz-local/.env` exists (from `.env.example`) — never committed
- [ ] Bluesky via Indie Takeoff
- [ ] LinkedIn keys + redirect URI
- [ ] Mastodon keys + `MASTODON_URL` + recreate Postiz
- [ ] Dev.to API key connected in Channels
- [ ] Hashnode token connected in Channels
- [ ] `docker compose up -d` in `postiz-local`
