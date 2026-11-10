// Report a startup error code, never a provider message/connection string.
import("./server").catch((error) => {
  console.error("Backend startup failed", {
    code:
      typeof error?.code === "string"
        ? error.code
        : "configuration_or_database_unavailable",
  });
  process.exit(1);
});
