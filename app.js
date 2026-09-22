// Plesk Node.js startup file.
// The production server is bundled by the API build.
import("./artifacts/api-server/dist/index.mjs").catch((error) => {
  console.error("Failed to start Nexarix API server:", error);
  process.exit(1);
});