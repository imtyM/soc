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
| `npm run lint` | Run TypeScript, Biome lint, and Convex-specific ESLint checks. |
| `npm run lint:convex` | Run type-aware Convex ESLint rules on authored backend code. |
| `npm run check` | Run TypeScript, Biome, and Convex lint checks without writing changes. |

## Agent integrations

Project-local MCP configuration supports Storybook and restricted Convex
inspection in Claude Code (`.mcp.json`) and Codex (`.codex/config.toml`). Open the
client from the repository root after `npm ci`; Convex uses the installed CLI,
not an automatically downloaded latest version. Restart/reconnect the client
and approve the project server if prompted.

Convex exposes only deployment status, table/schema metadata, function
interfaces, and health insights. It uses existing local Convex authentication;
missing access requires project-owner help, not a replacement deployment.
See [the MCP safety boundary in `AGENTS.md`](AGENTS.md#restricted-mcp-inspection)
before using it. This configuration is not credential isolation or permission
to inspect another deployment.

## Foundation smoke test

Run `npm run test:convex` for component-backed authentication/quota fixtures and `npm test` for the full suite, including browser interactions and accessibility. These tests use synthetic identities and controlled provider responses, never real SMS. For visual examples, run `npm run storybook` and open [http://localhost:6006](http://localhost:6006).

Phone sign-in is intentionally unavailable until separately approved Twilio Verify activation. See [the environment and activation boundary](docs/environment.md#phone-authentication-activation). There is no development-code delivery or password fallback. Do not obtain codes from backend logs or enable real SMS merely to run tests.

## Documentation

- [`AGENTS.md`](AGENTS.md): repository conventions and agent-development guardrails
- [Sea of change team guidance](https://linear.app/sea-of-change/document/agentsmd-5c46e6af0b9e): execution-mode and pull-request workflow
- [Setup project](https://linear.app/sea-of-change/project/setup-project-eb0c73b122c8): actionable foundation work and current decisions
- [`docs/environment.md`](docs/environment.md): local and Convex deployment environment ownership
- [`convex/_generated/ai/guidelines.md`](convex/_generated/ai/guidelines.md): managed Convex API guidance
- [`src/components/AGENTS.md`](src/components/AGENTS.md): component-specific conventions
- [`src/components/form/README.md`](src/components/form/README.md): form package guide; use Storybook for its live catalog
