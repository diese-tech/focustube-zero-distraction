import express from "express";
import type { HealthResponse } from "@focustube/shared";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.get("/api/health", (_request, response) => {
  const body: HealthResponse = {
    status: "ok",
    service: "focustube-api",
    timestamp: new Date().toISOString()
  };

  response.json(body);
});

app.listen(port, () => {
  console.log(`FocusTube API listening on http://localhost:${port}`);
});
