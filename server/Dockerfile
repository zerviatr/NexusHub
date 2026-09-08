FROM node:22-alpine

WORKDIR /app

# Install native build tools (for any native deps)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm install typescript --save-dev && npx tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]
