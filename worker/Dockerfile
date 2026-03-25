FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Set Playwright to use the pre-installed browsers in the image
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Copy package files
COPY worker/package*.json ./
RUN npm install

# Copy source code
COPY worker/src ./src
COPY worker/tsconfig.json ./

# Copy .env.example for reference (credentials should be passed via docker-compose or secrets)
COPY worker/.env.example ./

# Install dotenv for .env file loading
RUN npm install dotenv

# Build the project
RUN npm run build

# Create chrome profile directory
RUN mkdir -p /app/chrome-profile

# Default command
CMD ["npm", "start"]
