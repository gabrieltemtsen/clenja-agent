FROM node:22-alpine

WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare pnpm@10.2.0 --activate
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @clenja/api build

WORKDIR /app/apps/api

EXPOSE 8080

CMD ["sh", "-c", "node dist/server.js || node dist/src/server.js"]
