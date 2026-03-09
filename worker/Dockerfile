FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Copy worker package files
COPY worker/package*.json ./

RUN npm install

# Copy worker source
COPY worker .

RUN npm run build

RUN npx playwright install --with-deps chromium

EXPOSE 3000

CMD ["npm", "start"]
