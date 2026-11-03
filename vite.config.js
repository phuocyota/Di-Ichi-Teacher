import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/socket.io": {
          target: env.VITE_API_PROXY_TARGET || "https://be.di-ichi.edu.vn",
          changeOrigin: true,
          ws: true,
        },
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "https://be.di-ichi.edu.vn",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
