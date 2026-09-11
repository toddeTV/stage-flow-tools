# Optional Cloudflare Proxy/CDN

Cloudflare can proxy the existing Docker deployment without changing the application runtime:

```text
Cloudflare Proxy/CDN
        ↓
Origin server
        ↓
Traefik
        ↓
Stage Flow Tools container
```

Docker remains the supported runtime. This setup does not use Workers, Durable Objects, D1, Cloudflare Tunnel, or Cloudflare-specific application configuration.

## What Cloudflare Changes

Cloudflare caches static browser assets and adds edge-level traffic filtering and DDoS protection. API requests and WebSocket connections still reach the origin server. Cloudflare does not add capacity to Node.js, SQLite, or the WebSocket process.

The application uses one origin and one container, so every participant connects to the same in-memory quiz state. Do not add a second application replica without shared WebSocket coordination and shared storage.

Cloudflare supports proxied WebSockets on all plans. Edge deployments can terminate existing connections, so keep the application's 30-second heartbeat and automatic reconnect enabled. Argo Smart Routing is not compatible with proxied WebSockets. See [Cloudflare WebSockets](https://developers.cloudflare.com/network/websockets/).

## Prerequisites

Complete the [Docker Deployment Guide](deployment-docker.md) first. Confirm that:

- The public hostname reaches Traefik directly over HTTPS.
- Traefik serves a valid, unexpired certificate for the hostname.
- Participant and authenticated results WebSockets connect through `/_ws`.
- The host, Traefik, and application container allow at least 65,536 open files.

Keep the origin IP available during setup. Restricting origin access is the final hardening step.

## 1. Proxy the DNS Record

Add the site to Cloudflare and switch its authoritative nameservers as instructed by Cloudflare. Create an A record, and an AAAA record when the server uses IPv6, for the quiz hostname. Point the record to the origin server and set Proxy status to **Proxied**.

Only proxy the HTTP hostname. Do not proxy SSH or other administration services through this DNS record.

## 2. Require End-to-End TLS

In **SSL/TLS > Overview**, select **Full (strict)**. Traefik continues to terminate the origin HTTPS connection with its existing Let's Encrypt certificate.

Do not use Flexible mode. It leaves the Cloudflare-to-origin connection unencrypted and can cause redirect loops. See [Cloudflare SSL/TLS modes](https://developers.cloudflare.com/ssl/get-started/).

## 3. Keep WebSockets Compatible

In **Network**, enable WebSockets. Leave Rocket Loader disabled for the quiz hostname and do not enable Argo Smart Routing.

Traefik needs no WebSocket-specific middleware for `/_ws`. Cloudflare forwards the upgrade request through the existing HTTPS router. The Web Application Firewall inspects the initial upgrade request but not messages sent after the WebSocket is established.

Avoid tight per-IP limits on these paths:

- `/_ws`
- `/api/answers/submit`
- `/api/answers/retract`
- `/api/emojis/submit`

Conference Wi-Fi can place thousands of participants behind one public NAT address. If rate limiting is required, observe traffic first and choose limits that allow the full venue behind one IP.

## 4. Configure Caching

Do not enable Cache Everything for this hostname. Create one Cache Rule with **Bypass cache** for this expression:

```text
starts_with(http.request.uri.path, "/api/") or
starts_with(http.request.uri.path, "/_ws") or
starts_with(http.request.uri.path, "/admin") or
http.request.uri.path eq "/login"
```

No extra rule is required for `/_nuxt/`. Nitro already sends hashed Nuxt assets with `Cache-Control: public, max-age=31536000, immutable`, and Cloudflare caches JavaScript and CSS by default. See [Cloudflare default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/).

Caching reduces the origin load when many participants open the application together. It does not cache quiz answers, admin responses, HTML documents, or WebSocket messages.

## 5. Verify the Proxy

Open one participant page and one authenticated results page. Confirm both WebSockets receive status `101`, remain connected for several minutes, and reconnect after a manual network interruption. Publish a question, submit and retract an answer, and confirm that results update.

Request one hashed asset twice:

```bash
curl -I https://quiz.example.com/_nuxt/<hashed-asset>.js
```

The response should contain `CF-Ray`. The second request should normally contain `CF-Cache-Status: HIT`. A newly deployed or regionally cold asset can initially report `MISS`.

Check dynamic routes separately:

```bash
curl -I https://quiz.example.com/api/questions/active
curl -I https://quiz.example.com/login
```

These responses must not report `CF-Cache-Status: HIT`.

## 6. Restrict the Origin

After proxy verification, allow inbound HTTP and HTTPS only from Cloudflare's published IPv4 and IPv6 ranges. Block other sources on ports 80 and 443. Keep SSH restricted to trusted administration addresses.

Cloudflare updates its address list occasionally. Include the list in normal firewall maintenance. See [Cloudflare IP addresses](https://developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/).

This restriction prevents direct traffic from bypassing Cloudflare. It also means DNS-only mode cannot work until direct origin access is restored.

## Rollback

Use this order:

1. Allow direct public HTTPS access to the origin again.
2. Change the Cloudflare DNS record from **Proxied** to **DNS only**.
3. Confirm direct HTTPS and WebSocket access through Traefik.
4. Disable or remove Cloudflare-specific cache and security rules when the proxy will remain unused.

Changing DNS first while the firewall still accepts only Cloudflare addresses causes an outage.

## Privacy and Operations

With proxying enabled, Cloudflare processes visitor IP addresses and HTTP/WebSocket request metadata. The operator must review the applicable Cloudflare data-processing terms, account region settings, and deployment-specific privacy policy before public use. This setup does not by itself establish GDPR compliance.

Cloudflare does not make the single origin highly available. Continue monitoring the server, keeping SQLite backups, and rehearsing container restarts and WebSocket reconnects before an event.
