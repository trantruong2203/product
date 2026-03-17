FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files
COPY worker/package*.json ./

# Install dependencies
RUN npm install

# Copy the pre-installed browsers from the image to where npm expects them
RUN mkdir -p /root/.cache/ms-playwright && \
    cp -r /ms-playwright/chromium-1091 /root/.cache/ms-playwright/ && \
    cp -r /ms-playwright/firefox-1440 /root/.cache/ms-playwright/ && \
    cp -r /ms-playwright/webkit-1968 /root/.cache/ms-playwright/ || true

# Copy source code
COPY worker/src ./src
COPY worker/test ./test
COPY worker/tsconfig.json ./

# Create chrome profile directory
RUN mkdir -p /app/chrome-profile

# Default command
CMD ["npm", "run", "dev"]
