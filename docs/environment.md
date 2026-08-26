# Development environment

SOC currently uses one shared Convex development deployment. Local framework configuration selects and connects to that deployment; deployment environment variables configure server-side authentication. Keep those two stores separate.

## Local framework environment

Copy the committed placeholder template to the ignored local file:

```bash
cp .env.example .env.local
```

Obtain the current values from the project owner through a secure out-of-band channel, then replace the placeholders locally. Do not paste those values into chat, issues, logs, screenshots, or commits.

[`.env.example`](../.env.example) contains exactly these local variables:

| Variable | Purpose | Exposure |
| --- | --- | --- |
| `CONVEX_DEPLOYMENT` | Selects the existing shared development deployment for the Convex CLI. | Local deployment identifier; not a browser variable or secret. |
| `VITE_CONVEX_URL` | Public Convex client URL, with the deployment's `.convex.cloud` host. | Exposed to browser code. Never store a secret in it. |
| `VITE_CONVEX_SITE_URL` | Public Convex HTTP Actions/site URL, with the same deployment's `.convex.site` host. | Exposed to browser code. Never store a secret in it. |

All three values must identify the same shared development deployment. `VITE_SITE_URL` is unused and is not part of SOC's environment contract.

Do not create a replacement Convex project or deployment, run setup that relinks this repository, or substitute unrelated deployment URLs. Stop and ask the project owner if the shared values are missing or contradictory.

## Convex deployment environment

The shared development deployment owns these server-side values, declared by [`convex/convex.config.ts`](../convex/convex.config.ts):

| Variable | Purpose | Exposure |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Better Auth encryption and signing material. | Secret; deployment only. |
| `SITE_URL` | Application origin accepted by Better Auth. | Deployment only; must be `http://localhost:4317` for shared development. |

Never copy either value into a `VITE_*` variable or a committed file. Deployment variables are configured per deployment and are not read from `.env.local` by Convex functions.

## Run and verify safely

[`npm run dev`](../package.json) runs `convex dev` and starts Vite against the deployment selected by `CONVEX_DEPLOYMENT`. Vite serves SOC only at `http://localhost:4317`; [`vite.config.ts`](../vite.config.ts) makes that port strict.

Before starting, confirm locally that the cloud and site URL hosts use the same deployment slug and that `CONVEX_DEPLOYMENT` selects that shared deployment. Do not print or paste the file contents.

Verify only the names of deployment variables:

```bash
npx convex env list --names-only
```

Confirm that the output includes `BETTER_AUTH_SECRET` and `SITE_URL`. This command targets the development deployment selected by the local Convex configuration. Never use `npx convex env list` for routine verification because it prints values.

Then run:

```bash
npm run dev
```

Open `http://localhost:4317`, request a development phone OTP, retrieve it from the Convex function logs, and confirm sign-in succeeds. OTPs, phone numbers, session data, and log contents are private and must not be copied into documentation or review evidence.

## Troubleshooting

### `VITE_CONVEX_URL` is missing

The router stops during startup when the public client URL is absent. Confirm the variable name exists in `.env.local`, obtain the correct value from the project owner if needed, and restart `npm run dev`.

### `VITE_CONVEX_SITE_URL` is missing

Authentication setup fails when either Convex URL is absent. Confirm both required `VITE_CONVEX_*` names exist locally and restart the development server after correcting the local file.

### Cloud and site URLs do not match

The `.convex.cloud` and `.convex.site` hosts must use the same deployment slug, and `CONVEX_DEPLOYMENT` must select that deployment. Stop and ask the project owner for the canonical set; do not create or relink to another deployment as a shortcut.

### A deployment variable is missing

Convex validation during `npm run dev` can report a missing declared deployment variable. Run only `npx convex env list --names-only`. If `BETTER_AUTH_SECRET` or `SITE_URL` is absent, stop and ask the project owner. Routine setup must not generate, rotate, or overwrite either value.

### Authentication has origin or cookie problems

Confirm the app is running at `http://localhost:4317`. A wrong deployment `SITE_URL` can cause Better Auth origin or cookie failures. Do not print its current value; ask the project owner to verify or recover the deployment configuration safely.

## Project-owner bootstrap and recovery only

> This section is not routine developer onboarding. Use it only when bootstrapping or recovering the shared development deployment. Never overwrite or rotate an existing Better Auth secret merely to verify setup.

Generate a new high-entropy Better Auth secret only when a new or intentionally recovered deployment requires one:

```bash
npx auth@latest secret
```

Transfer the generated value directly to the Convex dashboard, or set it without placing the value in shell history:

```bash
npx convex env set BETTER_AUTH_SECRET
```

Omitting the value makes the CLI read it interactively/from standard input. Do not include the secret as a command argument.

Set the shared development application origin:

```bash
npx convex env set SITE_URL http://localhost:4317
```

Verify presence without exposing values:

```bash
npx convex env list --names-only
```

Never paste secrets, OTPs, tokens, cookies, environment values, or private user data into documentation, issues, logs, commits, screenshots, or chat. Secret rotation and production configuration belong to a dedicated deployment issue.

## Deferred concerns

Per-developer deployments, team secret distribution, production configuration, secret rotation, SMS provider credentials, and deployment automation are intentionally deferred.

## Official references

- [Convex environment variables](https://docs.convex.dev/production/environment-variables)
- [Convex environment CLI](https://docs.convex.dev/cli/reference/env)
- [Convex deployment URLs](https://docs.convex.dev/client/react/deployment-urls)
- [Better Auth CLI secret command](https://better-auth.com/docs/concepts/cli)
- [Better Auth installation and environment guidance](https://better-auth.com/docs/installation)
