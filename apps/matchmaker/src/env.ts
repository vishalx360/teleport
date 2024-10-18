import { createEnv } from "@t3-oss/env-core";
import { sharedEnvTypes } from "@repo/lib/sharedEnvTypes"

export const env = createEnv({
  server: {
    ...sharedEnvTypes.server,
    ...sharedEnvTypes.client,
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
