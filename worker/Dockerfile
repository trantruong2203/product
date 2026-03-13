# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY worker/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY worker/ ./

# Build the application
RUN npm run build

# Production stage
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Copy package files for production
COPY worker/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Install Playwright browser and dependencies (only chromium)
RUN npx playwright install --with-deps chromium

# Set Playwright browser path
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 3000

CMD ["npm", "start"]
