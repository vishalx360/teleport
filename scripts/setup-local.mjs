import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
const supportedNode =
  (nodeMajor === 20 && nodeMinor >= 19) ||
  (nodeMajor === 22 && nodeMinor >= 12) ||
  nodeMajor === 24;
if (!supportedNode) {
  console.error(`Unsupported Node.js ${process.versions.node}. Prisma 7 requires Node 20.19+, 22.12+, or 24.x.`);
  console.error("Run: nvm install && nvm use");
  process.exit(1);
}
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const localFiles = {
  "application/.env.local": `DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase"
REDIS_URL="redis://localhost:6379"
TEMPORAL_ADDRESS="localhost:7233"
TEMPORAL_NAMESPACE="default"
ALLOW_LOCAL_TEST_AUTH="true"
PUSHER_APP_ID="local-teleport"
PUSHER_SECRET="local-teleport-secret"
NEXT_PUBLIC_PUSHER_KEY="local-teleport-key"
NEXT_PUBLIC_PUSHER_CLUSTER="mt1"
NEXT_PUBLIC_PUSHER_HOST="localhost"
NEXT_PUBLIC_PUSHER_PORT="6001"
NEXT_PUBLIC_PUSHER_USE_TLS="false"
`,
  "matchmaker/.env": `DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase"
REDIS_URL="redis://localhost:6379"
KAFKA_URL="localhost:29092"
KAFKA_API_KEY=""
KAFKA_API_SECRET=""
PUSHER_APP_ID="local-teleport"
PUSHER_SECRET="local-teleport-secret"
PUSHER_CLUSTER="mt1"
PUSHER_KEY="local-teleport-key"
PUSHER_HOST="localhost"
PUSHER_PORT="6001"
PUSHER_USE_TLS="false"
TEMPORAL_ADDRESS="localhost:7233"
TEMPORAL_NAMESPACE="default"
`,
};

for (const [file, contents] of Object.entries(localFiles)) {
  const path = join(root, file);
  if (!existsSync(path)) writeFileSync(path, contents, "utf8");
}

const missingDependencies = ["application", "matchmaker"].filter(
  (packageDir) => !existsSync(join(root, packageDir, "node_modules")),
);
if (missingDependencies.length > 0) {
  console.error("Missing local dependencies:");
  for (const packageDir of missingDependencies) {
    console.error(`  - ${packageDir}/node_modules (run: cd ${packageDir} && pnpm install)`);
  }
  process.exit(1);
}

const applicationEnvFiles = ["application/.env.local", "application/.env"]
  .map((file) => join(root, file))
  .filter(existsSync);
const configuredKeys = new Set(
  applicationEnvFiles.flatMap((file) =>
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=/)?.[1])
      .filter(Boolean),
  ),
);
const missingPaymentConfiguration = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"].filter(
  (key) => !configuredKeys.has(key),
);
if (missingPaymentConfiguration.length > 0) {
  console.warn("Payment configuration missing (the app will run, but checkout is disabled):");
  for (const key of missingPaymentConfiguration) console.warn(`  - ${key} (add it to application/.env)`);
}

run("docker", ["compose", "up", "-d"]);
run("sh", ["-c", "until docker compose exec -T postgres pg_isready -U user -d mydatabase >/dev/null 2>&1; do sleep 1; done"]);
run("sh", ["-c", "until docker compose exec -T kafka kafka-topics --bootstrap-server kafka:9092 --list >/dev/null 2>&1; do sleep 1; done"]);
run("sh", ["-c", "DATABASE_URL='postgresql://user:password@localhost:5432/mydatabase' ./node_modules/.bin/prisma db push && DATABASE_URL='postgresql://user:password@localhost:5432/mydatabase' ./node_modules/.bin/prisma generate && DATABASE_URL='postgresql://user:password@localhost:5432/mydatabase' ./node_modules/.bin/tsx prisma/seed-local.ts"], { cwd: join(root, "application") });
console.log("\nLocal environment is ready. Run: pnpm dev");
