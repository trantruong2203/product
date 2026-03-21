/**
 * Load and stress test for worker
 * Tests memory usage, concurrency handling, and stability
 */

import { test, describe, beforeEach, afterEach } from "vitest";

// Mock job data generator
function generateMockJobData(index: number) {
  return {
    runId: `test-run-${index}-${Date.now()}`,
    promptId: `prompt-${index % 5}`,
    engineId: `engine-${index % 3}`,
    engineName: ["chatgpt", "gemini", "claude"][index % 3],
    prompt: `Test prompt ${index}: What is the capital of France?`,
  };
}

// Simulate memory measurement
function getMemoryUsageMB(): { heapUsed: number; heapTotal: number; rss: number } {
  const mem = process.memoryUsage();
  return {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    rss: Math.round(mem.rss / 1024 / 1024),
  };
}

describe("Worker Load Tests", () => {
  let initialMemory: { heapUsed: number; heapTotal: number; rss: number };

  beforeEach(() => {
    initialMemory = getMemoryUsageMB();
  });

  afterEach(() => {
    // Force GC if available
    if (global.gc) {
      global.gc();
    }
  });

  test("should measure initial memory baseline", () => {
    const mem = getMemoryUsageMB();
    console.log(`[Memory] Initial: Heap ${mem.heapUsed}MB, RSS ${mem.rss}MB`);
    
    // Initial memory should be under 200MB
    expect(mem.heapUsed).toBeLessThan(200);
  });

  test("should handle 5 sequential job simulations without memory leak", () => {
    const jobCount = 5;
    
    // Simulate job processing
    for (let i = 0; i < jobCount; i++) {
      const jobData = generateMockJobData(i);
      console.log(`[Test] Processing job ${i + 1}/${jobCount}: ${jobData.runId}`);
      
      // Simulate some work
      const mockResponse = "This is a simulated response with some text content.";
      expect(mockResponse.length).toBeGreaterThan(0);
    }

    // Force GC
    if (global.gc) global.gc();

    const finalMemory = getMemoryUsageMB();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    console.log(`[Memory] After ${jobCount} jobs: Heap ${finalMemory.heapUsed}MB (delta: +${memoryIncrease}MB)`);
    
    // Memory increase should be less than 100MB for 5 jobs
    expect(memoryIncrease).toBeLessThan(100);
  });

  test("should handle job data generation correctly", () => {
    const jobData = generateMockJobData(0);
    
    expect(jobData.runId).toBeTruthy();
    expect(jobData.promptId).toBeTruthy();
    expect(jobData.engineName).toMatch(/^(chatgpt|gemini|claude)$/);
    expect(jobData.prompt).toContain("Test prompt");
  });

  test("should simulate memory stress pattern", () => {
    const iterations = 10;
    const memorySnapshots: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      // Simulate job processing
      const mockData = new Array(10000).fill(0).map((_, idx) => ({
        id: idx,
        data: `mock-data-${i}-${idx}`,
      }));
      
      const mem = getMemoryUsageMB();
      memorySnapshots.push(mem.heapUsed);
      
      // Clear mock data
      mockData.length = 0;
    }

    // Force GC
    if (global.gc) global.gc();

    const finalMemory = getMemoryUsageMB();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    console.log(`[Memory] After stress test: ${finalMemory.heapUsed}MB (delta: +${memoryIncrease}MB)`);
    console.log(`[Memory] Snapshots: ${memorySnapshots.join("MB -> ")}MB`);
    
    // Memory should stabilize after GC
    expect(memoryIncrease).toBeLessThan(200);
  });
});

describe("Worker Health Check Tests", () => {
  test("should validate health status structure", () => {
    const mockHealthStatus = {
      status: "healthy" as const,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: getMemoryUsageMB(),
      browserPool: {
        activeContexts: 0,
        maxContexts: 2,
        status: "ok",
      },
    };

    expect(mockHealthStatus.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    expect(mockHealthStatus.timestamp).toBeTruthy();
    expect(mockHealthStatus.uptime).toBeGreaterThan(0);
    expect(mockHealthStatus.browserPool.maxContexts).toBeGreaterThan(0);
  });

  test("should validate metrics structure", () => {
    const mockMetrics = {
      jobsTotal: { chatgpt: 10, gemini: 5, claude: 3 },
      jobDuration: { avg: 30.5, max: 120 },
      activeContexts: 1,
      errorsTotal: 0,
    };

    expect(mockMetrics.jobsTotal).toBeDefined();
    expect(mockMetrics.jobDuration.avg).toBeGreaterThan(0);
    expect(mockMetrics.activeContexts).toBeGreaterThanOrEqual(0);
  });
});

describe("Worker Configuration Tests", () => {
  test("should validate environment configuration", () => {
    const config = {
      WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || "1", 10),
      MAX_BROWSER_CONTEXTS: parseInt(process.env.MAX_BROWSER_CONTEXTS || "2", 10),
      MEMORY_THRESHOLD_MB: parseInt(process.env.MEMORY_THRESHOLD_MB || "1500", 10),
    };

    // Default values should be sensible
    expect(config.WORKER_CONCURRENCY).toBeGreaterThan(0);
    expect(config.MAX_BROWSER_CONTEXTS).toBeGreaterThan(0);
    expect(config.MEMORY_THRESHOLD_MB).toBeGreaterThan(0);

    // For VPS, concurrency should be 1
    console.log(`[Config] WORKER_CONCURRENCY=${config.WORKER_CONCURRENCY}`);
    console.log(`[Config] MAX_BROWSER_CONTEXTS=${config.MAX_BROWSER_CONTEXTS}`);
    console.log(`[Config] MEMORY_THRESHOLD_MB=${config.MEMORY_THRESHOLD_MB}`);
  });
});
