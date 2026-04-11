FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/bot/package.json packages/bot/
RUN pnpm install --frozen-lockfile
COPY packages/bot/tsconfig.json packages/bot/
COPY packages/bot/src/ packages/bot/src/
RUN pnpm --filter @slack-bot/bot build

FROM base AS production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/bot/package.json packages/bot/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/bot/dist/ packages/bot/dist/
USER node
CMD ["node", "packages/bot/dist/index.js"]
