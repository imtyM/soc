---
name: convex-better-auth
description: Integrate Better Auth with Convex and TanStack Start. Use when implementing or changing Better Auth configuration, authenticated Convex functions, auth HTTP routes, auth providers, server-side auth helpers, session-aware SSR, or the @convex-dev/better-auth component.
---

# Convex with Better Auth

Follow the current Convex component guide instead of reconstructing the
integration from memory:

- TanStack Start:
  <https://labs.convex.dev/better-auth/framework-guides/tanstack-start>
- Basic usage: <https://labs.convex.dev/better-auth/basic-usage>
- Authorization: <https://labs.convex.dev/better-auth/authorization>

Before changing Convex code, read the repository's generated Convex guidelines.
Those local rules override examples in external documentation.

Treat the external guide as a wiring checklist, not copy-paste source. Reconcile
its snippets with the installed package APIs and existing router. In particular,
do not copy duplicate router declarations, mismatched function names, a plain
`ConvexProvider`, or a `vite/client` reference directive into a non-test file.

## Decide the auth behavior first

Confirm which mechanisms and production requirements are in scope:

- email and password, including verification and password reset
- phone OTP and its delivery provider
- social providers
- organizations, roles, and admin access
- local-only or production-ready configuration

Do not silently copy demo behavior such as logging OTPs or disabling email
verification into production.

## Fresh integration workflow

For TanStack Start:

1. Install compatible versions of `@convex-dev/better-auth`, pinned
   `better-auth`, current `convex`, and `@types/node`.
   If the TypeScript config has a `types` allowlist, either add the installed
   `node` types or import `process` from `node:process` in server-only files
   that use it.
2. Add `@convex-dev/better-auth` to Vite's `ssr.noExternal`.
3. Mount the component in `convex/convex.config.ts`.
4. Add `convex/auth.config.ts` with `getAuthConfigProvider()`.
5. Add `convex/auth.ts` with:
   - `createClient<DataModel>(components.betterAuth)`
   - a `createAuth(ctx)` factory
   - the component adapter and required `convex({ authConfig })` plugin
   - only the auth mechanisms the user approved
6. Register component HTTP routes in `convex/http.ts`.
7. Add `src/lib/auth-client.ts` using `createAuthClient` and
   `convexClient()`.
8. Add `src/lib/auth-server.ts` using
   `convexBetterAuthReactStart`.
9. Proxy matching GET and POST handlers through
   `src/routes/api/auth/$.ts`. Keep the default `/api/auth` path unless a
   custom path is deliberately chosen; the helper and route must agree.
10. Configure `ConvexQueryClient` with `expectAuth: true`, expose it in router
    context, hydrate the SSR token in the root route, and wrap the app with
    `ConvexBetterAuthProvider`. This component-specific provider is the
    auth-aware provider for this integration and replaces both plain
    `ConvexProvider` and the generic `ConvexProviderWithAuth` pattern.
11. Add sign-in, sign-up, sign-out, loading, and protected-route behavior. Gate
    authenticated Convex work with `Authenticated` or `useConvexAuth()`, not
    Better Auth's `useSession()`, so queries wait until Convex validates the
    token.

Do not assume `useSuspenseQuery(convexQuery(...))` carries authenticated SSR
context by itself. It depends on the router context, server HTTP client token,
auth-aware provider, and initial token wiring above.

## Environment boundaries

Local framework environment:

- `CONVEX_DEPLOYMENT`
- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `VITE_SITE_URL` when the application uses it

Convex deployment environment:

- `BETTER_AUTH_SECRET`
- `SITE_URL`
- provider secrets such as OAuth, email, or SMS credentials

Never place deployment-only provider secrets in `VITE_*` variables. In this
repository, declare app environment variables such as `SITE_URL` and
`BETTER_AUTH_SECRET` in `convex/convex.config.ts` and read app-used values from
the generated server `env` export. Do not copy the external guide's
`process.env.SITE_URL` pattern into Convex code.

## Calling Better Auth on the backend

Run Better Auth server APIs inside Convex functions. Use queries for reads and
mutations for writes. Always validate function arguments.

```ts
import { v } from "convex/values";

import { authComponent, createAuth } from "./auth";
import { mutation } from "./_generated/server";

export const updateUserPassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      },
      headers,
    });

    return null;
  },
});
```

The headers are required for methods that authenticate the current session.
For app authorization, derive identity server-side through the auth component
or Convex auth. Never trust a client-provided user identifier.

TanStack server functions may call the wrapper with the actual Convex argument
object:

```ts
await fetchAuthMutation(api.users.updateUserPassword, {
  currentPassword,
  newPassword,
});
```

Signing up, signing in, and signing out must use `authClient` on the client so
the HTTP response can manage cookies. With `expectAuth: true`, follow the
current guide's sign-out reload recommendation.

## Verification

Verify each layer independently:

1. Run Convex code generation, typechecking, and a one-shot development push.
2. Run the application typecheck, lint, tests, and production build.
3. Exercise sign-up/sign-in, SSR hydration, an authenticated query, a protected
   mutation, sign-out, and reload.
4. Confirm unauthenticated and unauthorized calls fail clearly.
5. For production, confirm the public site URL, provider callbacks, delivery
   providers, secrets, and deployment-specific configuration separately.

When implementing organizations or admin behavior, also consult:

- <https://www.better-auth.com/docs/plugins/organization>
- <https://www.better-auth.com/docs/plugins/admin>
