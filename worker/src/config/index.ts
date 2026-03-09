import dotenv from "dotenv";
dotenv.config();

// Reset Docker-specific path for local Windows run
if (process.env.PLAYWRIGHT_BROWSERS_PATH?.includes("ms-playwright")) {
  delete process.env.PLAYWRIGHT_BROWSERS_PATH;
}
if (process.env.PLAYWRIGHT_SCREENSHOTS_PATH?.includes("/app/")) {
  delete process.env.PLAYWRIGHT_SCREENSHOTS_PATH;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  database: {
    url: process.env.DATABASE_URL || "",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  playwright: {
    browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || "",
    screenshotsPath: process.env.PLAYWRIGHT_SCREENSHOTS_PATH || "./screenshots",
  },
};
