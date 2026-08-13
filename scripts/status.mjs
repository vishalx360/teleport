import { spawnSync } from "node:child_process";
const run = (args) => spawnSync("docker", args, { stdio: "inherit" });
run(["compose", "ps"]);
run(["compose", "exec", "-T", "kafka", "kafka-consumer-groups", "--bootstrap-server", "kafka:9092", "--describe", "--group", "matchmaking-group"]);
