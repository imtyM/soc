# SOC

SOC is currently establishing its technical foundation and development guardrails. Application and product requirements have not yet been specified.

Phone authentication and the authenticated todo flow are reference examples used to validate the foundation. They are not committed product scope.

## Stack

- TanStack Start, React, and TypeScript
- Convex with TanStack Query
- Better Auth with development phone OTP
- Tailwind CSS and shadcn/ui
- TanStack Form with Zod
- Storybook
- Biome

## Prerequisites

- Install and activate mise using the [official installation guidance](https://mise.jdx.dev/installing-mise.html).
- Obtain access to SOC's configured shared Convex development project.
- Obtain the local configuration described by [`.env.example`](.env.example) from the project owner through the secure process in [`docs/environment.md`](docs/environment.md).

[`mise.toml`](mise.toml) pins the exact project tools. `package.json` and `package-lock.json` own application dependencies; use npm scripts directly for application commands.

## Local setup

```bash
git clone https://github.com/imtyM/soc.git
cd soc
```

Trust the repository configuration if mise prompts you, then install and confirm the project tools:

```bash
mise trust
mise install
mise current
```

Install application dependencies from the lockfile:

```bash
npm ci
```

Create the ignored local environment file and follow the environment guide to replace its placeholders with the shared development configuration:

```bash
cp .env.example .env.local
```

See [`docs/environment.md`](docs/environment.md) for secure value ownership, verification, and troubleshooting. Do not create or relink to another Convex deployment during setup.

Start the application:

```bash
npm run dev
```

Open [http://localhost:4317](http://localhost:4317). The port is strict; the development server will not fall back to another port.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run Convex development and the local application server. |
| `npm run build` | Build the application and run the TypeScript check. |
| `npm run start` | Start the previously built production-style server. |
| `npm run storybook` | Run Storybook at [http://localhost:6006](http://localhost:6006). |
| `npm run build-storybook` | Build the static Storybook catalog. |
| `npm run format` | Format the repository with Biome. |
| `npm run lint` | Run TypeScript and Biome lint checks. |
| `npm run check` | Run the full TypeScript and Biome checks without writing changes. |

## Foundation smoke test

With `npm run dev` running:

1. Open [http://localhost:4317](http://localhost:4317).
2. Request a phone OTP.
3. Retrieve the development OTP from the Convex function logs without sharing the phone number, OTP, session data, or logs.
4. Sign in and confirm that Convex validates the Better Auth session.
5. Create a todo, update its completion or priority, and delete it.
6. Optionally run `npm run storybook` and open [http://localhost:6006](http://localhost:6006).

Logging the OTP is development-only delivery. It must be replaced before phone authentication is exposed outside a trusted local environment.

## Documentation

- [`AGENTS.md`](AGENTS.md): repository conventions and agent-development guardrails
- [Sea of change team guidance](https://linear.app/sea-of-change/document/agentsmd-5c46e6af0b9e): execution-mode and pull-request workflow
- [Setup project](https://linear.app/sea-of-change/project/setup-project-eb0c73b122c8): actionable foundation work and current decisions
- [`docs/environment.md`](docs/environment.md): local and Convex deployment environment ownership
- [`convex/_generated/ai/guidelines.md`](convex/_generated/ai/guidelines.md): managed Convex API guidance
- [`src/components/AGENTS.md`](src/components/AGENTS.md): component-specific conventions
- [`src/components/form/README.md`](src/components/form/README.md): form package guide; use Storybook for its live catalog
