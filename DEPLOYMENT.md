# Estumuzik web app — Coolify deployment guide

This is the deployment process for `Bloocode-Technology/estumuzik-web-app`
using the Bloocode Coolify server.

The production Coolify dashboard is:

```text
https://server.bloocodetechnology.com
```

Do not create a second Coolify server for this repository. Use the existing
validated deployment server and create a separate application resource for
this repository.

## Architecture

```text
GitHub repository (main)
        |
        | GitHub App webhook
        v
Coolify application resource
        |
        | Docker Compose build and deployment
        v
Existing Bloocode VPS
        |
        | Coolify proxy + HTTPS
        v
Estumuzik domain
```

Coolify is the deployment source of truth. GitHub stores the code and the
Docker configuration. Coolify stores the production environment values and
deploys the application.

## Deployment files in this repository

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage production image (Node 22 Alpine, Next.js standalone output, non-root user, listens on `0.0.0.0:3000`) |
| `docker-compose.yml` | Single `web` service that Coolify builds and routes to |
| `.dockerignore` | Keeps `node_modules`, `.next`, `.env`, certificates and Git data out of the build context |
| `.env` | Committed public `NEXT_PUBLIC_*` values (no secrets) for local builds |
| `.env.example` | Names of the required variables, without values |
| `src/app/api/health/route.ts` | Health endpoint that returns `{"status":"ok"}` |
| `next.config.js` | Sets `output: "standalone"` so the image contains only what it needs to run |

The auth proxy in `src/proxy.ts` skips `/api/*`, so `/api/health` is
reachable without logging in.

## One-time Coolify setup

These steps are shared across all Bloocode repositories. Skip any that are
already done:

1. Open the Coolify dashboard and select the `Root Team`.
2. Use the existing validated VPS server. Do not add the same VPS again.
3. Create or reuse the production project and environment for Estumuzik,
   for example:

   ```text
   Project: Estumuzik
   Environment: production
   ```

4. Make sure the `Bloocode-Technology` organization is connected through the
   GitHub App.
5. Give the GitHub App access to `estumuzik-web-app`.
6. Keep the source available to the team that owns the production project.

Use the GitHub App for this private repository. Do not add a separate SSH
deploy key unless there is a specific reason.

## Creating the application resource

1. Push the deployable code to `main`.
2. In Coolify, open the Estumuzik project and the `production` environment.
3. Select **New Resource** → **Git Repository (with GitHub App)**.
4. Select the connected Bloocode GitHub App.
5. Select the repository and branch:

   ```text
   Repository: Bloocode-Technology/estumuzik-web-app
   Branch: main
   ```

6. Build pack: **Docker Compose**.
7. Compose location:

   ```text
   Base directory: /
   Docker Compose location: /docker-compose.yml
   ```

8. Public HTTP service: `web`. Internal port: `3000`.
9. Add the environment variables listed below.
10. Add the domain to the `web` service and save.
11. Deploy and watch the deployment logs until the service is healthy.

When adding the domain, enter the public hostname without a Docker port:
`https://www.estumuzik.com`. Coolify routes it to the service's internal
port `3000`. Visitors should never need to enter the container port in the
public URL.

## Domain and DNS

Give the app its own hostname, for example:

```text
Estumuzik web app:  www.estumuzik.com
Coolify dashboard:  server.bloocodetechnology.com
```

Create an `A` record or a `CNAME` that resolves the hostname to the server
running Coolify. Confirm that Coolify reports **DNS matches** before testing
the application.

Use Coolify's proxy for HTTPS. Do not add a separate Nginx configuration.

If Cloudflare is in front of the VPS, use **SSL/TLS → Full (strict)** once
the Coolify origin certificate is available. Do not use Flexible mode while
Coolify redirects HTTP to HTTPS; that causes a redirect loop.

## Environment variables

This repo commits `.env` because it only holds public `NEXT_PUBLIC_*` values,
which ship in the browser bundle anyway. Never add a private key or API secret
to it. Also add the production values under the application's **Environment
Variables** section in Coolify, since Coolify is the source of truth.

This app has three variables, and all are `NEXT_PUBLIC_*` values read by
client code:

| Variable | Used in | Value |
|---|---|---|
| `NEXT_PUBLIC_BACK_URL` | `src/components/utils/endpoints.ts` (`API_URL`) | `https://api.estumuzik.com/api` |
| `NEXT_PUBLIC_FRONT_URL` | `src/components/utils/endpoints.ts` (`BaseUrl`) | `https://www.estumuzik.com` (must include `https://`; share links are built from it) |
| `NEXT_PUBLIC_WP_IMAGE_URL` | `src/components/utils/data.ts` (`IMAGE_URL`) | `https://www.estumuzik.com` (placeholder; not read by the code yet) |

### Build time versus runtime

- Next.js inlines `NEXT_PUBLIC_*` values into the browser bundle during
  `next build`, so the build needs all three. In Coolify, enable **Build
  Variable** (build time) for each one. `docker-compose.yml` passes them to
  the Dockerfile as build args.
- They are also passed to the container at runtime for any server-side code.
- **Changing any of these values requires a new deployment (rebuild).**
  Restarting the container won't update the values in the browser bundle.

If a server-only secret is added later, give it a name without the
`NEXT_PUBLIC_` prefix, add it only to `environment:` in
`docker-compose.yml`, and keep it runtime-only in Coolify.

## Recovering a deleted local `.env`

Deleting a local `.env` does not delete the production values stored in
Coolify. Check the application's Coolify **Environment Variables** page
first, because Coolify is the source of truth.

| Variable | Safe recovery method |
|---|---|
| `NEXT_PUBLIC_BACK_URL` | Confirm the API domain with the backend deployment owner |
| `NEXT_PUBLIC_FRONT_URL` | Use the application's final Coolify domain |
| `NEXT_PUBLIC_WP_IMAGE_URL` | Confirm the WordPress/media host with the content owner |

Find the required variable names from these safe sources:

```bash
cat .env.example
grep -nE '\$\{|ARG ' docker-compose.yml Dockerfile
```

Do not print values to a terminal recording, screenshot, chat, or Git commit.

## Running the image locally

```bash
# .env (committed) holds the public values
docker compose build
docker compose run --rm -p 3000:3000 web
curl http://localhost:3000/api/health   # {"status":"ok"}
```

The Compose file uses `expose` rather than `ports` because Coolify's proxy
handles public traffic. That is why the local run uses `-p 3000:3000`.

## Verification checklist

Before showing a deployment to a client, verify:

- The GitHub App can access `estumuzik-web-app`.
- The selected branch is `main`.
- Coolify shows the `web` Compose service on port `3000`.
- All three environment variables have values.
- **Build Variable** is enabled for all three `NEXT_PUBLIC_*` values.
- The domain reports **DNS matches**.
- The Coolify deployment completes successfully.
- The service is healthy in Coolify (the container healthcheck calls
  `/api/health`).
- `https://www.estumuzik.com/api/health` returns HTTP 200.
- The public page loads over HTTPS and redirects to `/auth/login` when you
  are logged out.
- Login, API calls to the backend, images, and podcast/episode playback work.

## Automatic deployments

1. Push a commit to `main`.
2. GitHub sends the webhook to Coolify.
3. Coolify pulls the commit, rebuilds the image, and replaces the running
   container.
4. Review the deployment logs and health status.

If a push does not trigger a deployment, check the GitHub App repository
selection, the Coolify source status, webhook delivery in GitHub, and the
application's auto-deploy setting.

## Rollback

Open the application's **Deployments** page in Coolify, select a previously
successful deployment, and redeploy it. Do not delete the application or its
Docker volumes when a normal code rollback is enough.

## Security rules

- Never commit secrets: server-only values, certificates (`*.pem`), SSH
  private keys, or API keys. The committed `.env` must only hold public
  `NEXT_PUBLIC_*` values. `.gitignore` excludes `*.pem` and `.env*.local`.
- Rotate any credential that appears in a screenshot, chat, commit, or log.
- Use read-only GitHub access where possible.
- Keep production variables in Coolify and restrict team access.
- Do not print all container environment variables when troubleshooting.
- Prefer GitHub App access over shared deploy keys.
