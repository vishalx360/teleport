import { spawn, spawnSync } from "node:child_process";

const mode = process.argv[2];
if (!mode) {
  const setup = spawnSync("node", ["scripts/setup-local.mjs"], { stdio: "inherit" });
  if (setup.status !== 0) process.exit(setup.status ?? 1);
}

const processes = [];
const start = (command, args, cwd, env = {}) => {
  const child = spawn(command, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  processes.push(child);
};
if (mode !== "--worker") start("./node_modules/.bin/next", ["dev"], "application", { SKIP_ENV_VALIDATION: "1" });
if (mode !== "--web") start("./node_modules/.bin/tsx", ["watch", "src/index.ts"], "matchmaker");
const stop = () => processes.forEach((child) => child.kill("SIGINT"));
process.on("SIGINT", stop); process.on("SIGTERM", stop);
