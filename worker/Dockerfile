FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files
COPY worker/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY worker/src ./src
COPY worker/test ./test
COPY worker/tsconfig.json ./

# Create chrome profile directory
RUN mkdir -p /app/chrome-profile

# Default command
CMD ["npm", "run", "dev"]
