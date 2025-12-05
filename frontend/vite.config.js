import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = env.PORT || env.FRONTEND_PORT || 3000;

  return {
    plugins: [
      react({
        jsxRuntime: "classic",
      }),
    ],
    server: {
      port: Number(port),
      host: '0.0.0.0',
      open: false,
      allowedHosts: ["crm.qzydu8.easypanel.host"],
    },
    build: {
      outDir: "build",
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "material-ui": [
              "@material-ui/core",
              "@material-ui/icons",
              "@material-ui/lab",
            ],
          },
        },
      },
    },
    envPrefix: ["VITE_", "REACT_APP_"],
    esbuild: {
      loader: "jsx",
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    define: {
      global: "globalThis",
      "window.Lame": "undefined",
    },
    optimizeDeps: {
      include: [
        "mic-recorder-to-mp3",
        "lamejs",
        "@material-ui/core",
        "@material-ui/icons",
        "@material-ui/lab",
      ],
      exclude: [],
      esbuildOptions: {
        loader: {
          ".js": "jsx",
        },
      },
    },
    resolve: {
      alias: {
        "jss-plugin-globalThis": "jss-plugin-global",
      },
    },
  };
});
