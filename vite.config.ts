import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Build to Vercel Build Output API (serverless SSR function + static assets).
  nitro: { preset: "vercel" },

  tanstackStart: {
    server: {
      entry: "server",
    },
  },

  vite: {
    server: {
      port: 8080,
      strictPort: true,
    },
  },
});