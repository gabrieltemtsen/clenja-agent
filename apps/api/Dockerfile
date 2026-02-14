FROM node:22-alpine

WORKDIR /app

COPY . .

RUN corepack enable && corepack prepare pnpm@10.2.0 --activate
RUN pnpm install --frozen-lockfile=false

EXPOSE 8787

CMD ["pnpm", "--filter", "@clenja/api", "dev"]
