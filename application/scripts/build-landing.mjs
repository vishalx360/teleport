import { spawnSync } from "node:child_process";

const fallbackEnvironment = {
  DATABASE_URL: "postgresql://landing:landing@127.0.0.1:5432/landing",
  REDIS_URL: "redis://127.0.0.1:6379",
  NEXTAUTH_SECRET: "landing-page-build-only",
  NEXTAUTH_URL: "https://teleport-landing.invalid",
  GITHUB_CLIENT_ID: "landing-page-build-only",
  GITHUB_CLIENT_SECRET: "landing-page-build-only",
  GOOGLE_CLIENT_ID: "landing-page-build-only",
  GOOGLE_CLIENT_SECRET: "landing-page-build-only",
  NEXT_PUBLIC_MAPBOX_TOKEN: "landing-page-build-only",
  NEXT_PUBLIC_PUSHER_KEY: "landing-page-build-only",
  NEXT_PUBLIC_PUSHER_CLUSTER: "mt1",
  PUSHER_APP_ID: "landing-page-build-only",
  PUSHER_SECRET: "landing-page-build-only",
};

const buildEnvironment = {
  ...process.env,
  SKIP_ENV_VALIDATION: "1",
};

for (const [key, value] of Object.entries(fallbackEnvironment)) {
  if (!buildEnvironment[key]) buildEnvironment[key] = value;
}

const result = spawnSync("pnpm", ["exec", "next", "build"], {
  cwd: process.cwd(),
  env: buildEnvironment,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
