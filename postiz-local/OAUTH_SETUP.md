# OAuth setup for MVP channels (Postiz Docker)

MVP: **Bluesky**, **LinkedIn**, **Reddit**

Secrets live in `postiz-local/.env` (gitignored). Compose reads them automatically.

```powershell
cd postiz-local
copy .env.example .env
# edit .env with real LinkedIn / Reddit keys
docker compose up -d
```

Local redirect base: `http://localhost:5000`

Indie Takeoff → Social → Channels → Connect → finish → Refresh.

Official guides: https://docs.postiz.com/providers/overview

---

## 1. Bluesky (no developer keys)

Connect entirely in Indie Takeoff → Channels → Connect Bluesky (handle + app password).

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

Compose applies a startup patch so personal LinkedIn OAuth works (`prompt=consent` + no org-only scopes). LinkedIn **Pages** still need Community Management API (not covered).

---

## 3. Reddit

Docs: https://docs.postiz.com/providers/reddit  
Portal: https://www.reddit.com/prefs/apps

1. Create **web app**.
2. Redirect URI:

   `http://localhost:5000/integrations/social/reddit`

3. Put keys in `postiz-local/.env`:

   ```env
   REDDIT_CLIENT_ID=...
   REDDIT_CLIENT_SECRET=...
   ```

4. Recreate Postiz, then Connect **Reddit** in Indie Takeoff.

When posting from Compose, set **subreddit** (without `r/`) and **title**.

---

## Checklist

- [ ] `postiz-local/.env` exists (from `.env.example`) — never committed
- [ ] Bluesky via Indie Takeoff (handle + app password)
- [ ] LinkedIn keys + redirect URI
- [ ] Reddit keys + redirect URI
- [ ] `docker compose up -d` in `postiz-local`
- [ ] Indie Takeoff → Social → Channels → Connect / Refresh
