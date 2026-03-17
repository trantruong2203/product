FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY backend/src ./src
COPY backend/test ./test
COPY backend/tsconfig.json ./

# Expose port
EXPOSE 3001

# Default command
CMD ["npm", "run", "dev"]
