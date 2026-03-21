/**
 * Health check server for worker monitoring
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { browserPool } from "./browsers/browserPool.js";
import { register } from "./metrics.js";
import db from "./config/database.js";

// Environment configuration
const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || "8080", 10);
const HEALTH_HOST = process.env.HEALTH_HOST || "0.0.0.0";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  browserPool: {
    activeContexts: number;
    maxContexts: number;
    status: string;
  };
  database: {
    status: string;
    error?: string;
  };
}

/**
 * Get current health status
 */
async function getHealthStatus(): Promise<HealthStatus> {
  const memory = process.memoryUsage();
  const browserStats = browserPool.getMemoryStats();
  
  const status: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      rss: Math.round(memory.rss / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024),
    },
    browserPool: {
      activeContexts: browserStats.contexts,
      maxContexts: browserStats.maxContexts,
      status: "ok",
    },
    database: {
      status: "ok",
    },
  };
  
  // Check database connection
  try {
    await db.select().from((await import("./db/schema.js")).users).limit(1);
  } catch (error) {
    status.database.status = "error";
    status.database.error = String(error);
    status.status = "degraded";
  }
  
  // Check if memory is high
  if (status.memory.heapUsed > 1200) {
    status.status = "degraded";
  }
  
  // Check if too many contexts are active
  if (browserStats.contexts >= browserStats.maxContexts) {
    status.status = "degraded";
  }
  
  return status;
}

/**
 * Handle incoming HTTP requests
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || "";
  
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  
  try {
    if (url === "/health" || url === "/healthz" || url === "/") {
      // Health check endpoint
      const health = await getHealthStatus();
      const statusCode = health.status === "healthy" ? 200 : 
                        health.status === "degraded" ? 200 : 503;
      
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(health, null, 2));
      
    } else if (url === "/metrics") {
      // Prometheus metrics endpoint
      res.writeHead(200, { "Content-Type": register.contentType });
      res.end(await register.metrics());
      
    } else if (url === "/ready" || url === "/readiness") {
      // Readiness probe
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ready: true }));
      
    } else if (url === "/live" || url === "/liveness") {
      // Liveness probe
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ alive: true }));
      
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  } catch (error) {
    console.error(`[HealthServer] Error handling ${url}:`, error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

/**
 * Start the health check server
 */
export function startHealthServer(): void {
  const server = createServer(handleRequest);
  
  server.listen(HEALTH_PORT, HEALTH_HOST, () => {
    console.log(`[HealthServer] Listening on ${HEALTH_HOST}:${HEALTH_PORT}`);
    console.log(`[HealthServer] Endpoints:`);
    console.log(`  - GET /health  - Full health status`);
    console.log(`  - GET /metrics - Prometheus metrics`);
    console.log(`  - GET /ready  - Readiness probe`);
    console.log(`  - GET /live   - Liveness probe`);
  });
  
  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("[HealthServer] Shutting down...");
    server.close(() => {
      console.log("[HealthServer] Closed");
      process.exit(0);
    });
  });
}
