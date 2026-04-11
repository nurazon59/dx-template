FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/slack-bot/package.json packages/slack-bot/
RUN pnpm install --frozen-lockfile
COPY packages/slack-bot/tsconfig.json packages/slack-bot/
COPY packages/slack-bot/src/ packages/slack-bot/src/
RUN pnpm --filter @dx-template/slack-bot build

FROM base AS production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/slack-bot/package.json packages/slack-bot/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/slack-bot/dist/ packages/slack-bot/dist/
USER node
CMD ["node", "packages/slack-bot/dist/index.js"]
