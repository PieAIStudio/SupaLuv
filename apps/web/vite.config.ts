import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const webPort = Number(process.env.SUPALUV_WEB_PORT ?? process.env.SUPALUV_E2E_WEB_PORT ?? 5173);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: webPort,
  },
  preview: {
    host: "127.0.0.1",
    port: webPort + 100,
  },
});
