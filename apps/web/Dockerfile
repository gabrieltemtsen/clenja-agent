FROM node:22-alpine

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN corepack enable && corepack prepare pnpm@10.2.0 --activate
RUN pnpm install --frozen-lockfile=false

# Copy source
COPY apps/web/ ./apps/web/
COPY packages/shared/ ./packages/shared/

# Build
RUN pnpm --filter @clenja/web build

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "start"]
