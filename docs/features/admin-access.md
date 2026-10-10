# Admin Access

## Overview

Admin access protects question controls, presentation surfaces, results, and database administration. The dashboard links to each admin page.

## Access and prerequisites

`/login` is public. `/admin` and its sub-pages require verified admin access. Operators configure credentials through [`.env.example`](../../.env.example) and the [deployment guide](../deployment-docker.md).

## Capabilities and controls

- Sign in with username and password to establish an HTTP-only `admin_token` cookie.
- Select a feature from the admin dashboard and log out to clear the cookie.
- Authenticate external API software with a bearer header.
- Bootstrap a protected browser page with `?token=` when a header cannot be attached; the middleware removes the token after verification.

## Parameters and configuration

| Scope / mode | Name | Type and allowed values | Default | Effect | Invalid input |
| --- | --- | --- | --- | --- | --- |
| Login URL | `redirect` | Relative path starting with one `/`, without `://` | `/admin` | Selects the page after login | Invalid or repeated values use `/admin` |
| Admin-page URL | `token` | Single valid admin token | Absent | Establishes the browser session, then is removed | Failed verification redirects to login with a token-free path |
| Server | `NUXT_ADMIN_USERNAME` | String | `admin` | Login username | Non-matching submitted credentials reject login |
| Server | `NUXT_ADMIN_PASSWORD` | String | Development-only default; replace in production | Login password | Non-matching submitted credentials reject login |
| Server | `NUXT_ADMIN_TOKEN` | Optional static token | Empty; disabled | Enables static bearer access | Empty disables this path; non-matching tokens require valid JWT verification |
| Server | `NUXT_JWT_SECRET` | String | Development-only default; replace in production | Signs and verifies sessions | Invalid signatures reject authentication |
| Cross-origin API | `NUXT_API_CORS_ENABLED` | Boolean | `false` | Enables configured REST CORS | See the deployment configuration contract |
| Cross-origin API | `NUXT_API_CORS_ALLOWED_ORIGINS` | Comma-separated exact HTTP(S) origins | Empty | Allows configured REST origins | Wildcards, paths, credentials, and invalid origins are rejected |

Authentication and API contracts live in the [API reference](../api.md#authentication). CORS setup lives in the [deployment guide](../deployment-docker.md); it is separate from Presenter parent-origin permission.

## Behavior and limitations

Browser-login JWTs expire after 24 hours. Verification failures or a route verification timeout redirect to login. Protected server endpoints independently enforce authentication.

Cookie-authenticated HTTP mutations require the Stage Flow origin. HTTPS cookies use `Secure` and `SameSite=None`; HTTP cookies use `SameSite=Lax`. Browser privacy settings must permit the session cookie inside an embedded frame. Sign in at the Stage Flow origin before opening embedded displays.

Do not put tokens in public presentation URLs, bundles, repositories, logs, or screenshots. Prefer the existing cookie for browser pages and bearer headers for external software. CORS does not enable cross-origin cookie mutations or relax the protected WebSocket origin check.

## Examples

Open `/login?redirect=%2Fadmin%2Fquestions`, sign in, and continue to the questions page. Open `/admin` to select other tools.

For an embedded display, sign in at the deployed Stage Flow origin first, then open the presentation containing its iframe. For server-to-server access, use the bearer-header workflow in the [authentication reference](../api.md#authentication).

## Implementation and verification

- [Login page](../../app/pages/login.vue), [dashboard](../../app/pages/admin/index.vue), and [route middleware](../../app/middleware/auth.ts) own browser access.
- [Server authentication](../../server/utils/auth.ts) and [auth tests](../../server/utils/auth.test.ts) verify cookies, tokens, and origins.
- [Admin route integration tests](../../test/admin-route-auth.integration.test.ts) verify protected routes.

## Related references

- [Feature Guide](README.md)
- [Presenter](presenter.md) and [Database admin](database-admin.md)
- [Authentication API](../api.md#authentication), [deployment](../deployment-docker.md), and [WebSockets](../websocket.md)
