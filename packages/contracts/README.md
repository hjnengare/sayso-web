# @sayso/contracts

Shared TypeScript contracts for Sayso web and mobile clients.

## Scope

- Auth/session DTOs
- Business discovery/listing DTOs
- Saved businesses DTOs
- Notifications DTOs
- Mobile push-token request/response DTOs

## Usage

```ts
import type {
  NotificationsResponseDto,
  SavedBusinessesResponseDto,
  RegisterPushTokenRequestDto,
} from '@sayso/contracts';
```

## Publishing

1. Bump `version` in `package.json`.
2. Build: `npm run build`.
3. Publish to your private registry.
4. Pin the consuming app with an explicit version.
