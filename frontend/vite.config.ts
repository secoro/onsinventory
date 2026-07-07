import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
// The release workflow pins this version to the app version (e.g. 1.0.2);
// dev builds carry the -dev.0 prerelease suffix
import { version } from "./package.json";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  server: {
    port: 5173
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**"]
    }
  }
});
