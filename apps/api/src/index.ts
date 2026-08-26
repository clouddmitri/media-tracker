import { SHARED_PACKAGE_VERSION } from "@media-tracker/shared";
import { env } from "./config/env.js";

export function main(): void {
  console.log(`media-tracker api (shared ${SHARED_PACKAGE_VERSION})`);
  console.log(env);
}

main();
