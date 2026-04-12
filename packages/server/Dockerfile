FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/workflow/package.json packages/workflow/
COPY packages/agent/package.json packages/agent/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile
COPY packages/workflow/tsconfig.json packages/workflow/
COPY packages/workflow/src/ packages/workflow/src/
COPY packages/agent/tsconfig.json packages/agent/
COPY packages/agent/src/ packages/agent/src/
COPY packages/server/tsconfig.json packages/server/
COPY packages/server/src/ packages/server/src/
RUN pnpm --filter @dx-template/server build

FROM base AS production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/workflow/package.json packages/workflow/
COPY packages/agent/package.json packages/agent/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile
COPY packages/server/drizzle.config.ts packages/server/
COPY packages/server/drizzle/ packages/server/drizzle/
COPY packages/server/src/ packages/server/src/
COPY --from=build /app/packages/workflow/dist/ packages/workflow/dist/
COPY --from=build /app/packages/agent/dist/ packages/agent/dist/
COPY --from=build /app/packages/server/dist/ packages/server/dist/
USER node
EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
