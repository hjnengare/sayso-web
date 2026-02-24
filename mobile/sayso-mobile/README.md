# Sayso Mobile (Expo)

Native-first iOS + Android app scaffold for Sayso.

## Quick start

1. Install deps

```bash
npm install
```

2. Copy env file

```bash
cp .env.example .env
```

3. Run app

```bash
npm run start
```

## Included

- Expo Router tabs: Home, Search, Saved, Notifications, Profile
- Supabase auth with SecureStore persistence (email/password + Google OAuth)
- Bearer-token API client for Next.js `/api` routes
- Push token registration hooks (`/api/user/push-tokens`)
- Realtime notifications subscription

## Notes

- This scaffold is committed inside the web repo for bootstrap convenience.
- For production, move this folder into its own repository (`sayso-mobile`) and pin `@sayso/contracts` to a published version.
