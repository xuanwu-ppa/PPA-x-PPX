import express from "express";
import { createServer as createViteServer } from "vite";
import apiRoutes from "./src/api/routes";

async function startServer() {
  const app = express();
  // Ensure we use the port provided by the environment, but default to 3000 as per platform requirements
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.use("/api", apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    app.use(express.static('dist'));
    // SPA fallback: serve index.html for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(new URL('./dist/index.html', import.meta.url).pathname);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on 0.0.0.0:${PORT}`);
  });
}

startServer();
