# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY worker/package*.json ./
RUN npm install

COPY worker/ ./

RUN npx tsc --project tsconfig.build.json


# Production stage
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Copy package files
COPY worker/package*.json ./

# Install production deps
RUN npm install --omit=dev

# Copy build output
COPY --from=builder /app/dist ./dist

# Install Playwright browsers (image đã có dependencies)
RUN npx playwright install chromium

# Set browser path and skip runtime download
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

CMD ["node", "dist/index.js"]