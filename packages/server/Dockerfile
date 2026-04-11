FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile
COPY packages/server/tsconfig.json packages/server/
COPY packages/server/src/ packages/server/src/
RUN pnpm --filter @dx-template/server build

FROM base AS production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile
COPY packages/server/drizzle.config.ts packages/server/
COPY packages/server/drizzle/ packages/server/drizzle/
COPY packages/server/src/ packages/server/src/
COPY --from=build /app/packages/server/dist/ packages/server/dist/
USER node
EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
