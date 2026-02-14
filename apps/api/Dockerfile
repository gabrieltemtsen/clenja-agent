FROM node:22-alpine

WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare pnpm@10.2.0 --activate
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @clenja/api build

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
