# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
# Note: drizzle.config.json not needed for production runtime

EXPOSE 3001
CMD ["npm", "start"]
