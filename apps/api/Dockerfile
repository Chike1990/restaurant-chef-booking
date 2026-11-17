# Build from the repo root: docker build -f apps/api/Dockerfile .
#
# This is a pnpm workspace — apps/api depends on packages/shared, which
# ships as raw TypeScript with no build step (packages/shared/package.json's
# "exports" points straight at ./src/index.ts, consumed via Node's native
# type stripping). A normal `pnpm install` symlinks
# apps/api/node_modules/@golden-spoon/shared directly to the sibling
# packages/shared directory, so its real path sits outside node_modules and
# type stripping is allowed.
#
# `pnpm deploy` does NOT preserve that: it flattens workspace deps into
# node_modules/.pnpm/..., and Node explicitly refuses to strip types for any
# file whose real path passes through node_modules
# (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING). So this Dockerfile copies
# the monorepo's real relative layout into the image instead of using
# pnpm deploy — apps/api and packages/shared stay siblings, exactly as they
# are in the repo, and the workspace symlink resolves the same way it does
# in development.

FROM node:26-alpine AS base
# corepack isn't bundled in this image; pin pnpm directly instead.
RUN npm install -g pnpm@12.18.0
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

FROM base AS build
RUN pnpm install --frozen-lockfile --filter @golden-spoon/api...
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN pnpm --filter @golden-spoon/api build

FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter @golden-spoon/api...

FROM node:26-alpine AS runtime
RUN addgroup -S golden-spoon && adduser -S golden-spoon -G golden-spoon
WORKDIR /app
COPY --from=prod-deps --chown=golden-spoon:golden-spoon /app/node_modules ./node_modules
COPY --from=prod-deps --chown=golden-spoon:golden-spoon /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=golden-spoon:golden-spoon /app/apps/api/package.json ./apps/api/package.json
COPY --from=prod-deps --chown=golden-spoon:golden-spoon /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build --chown=golden-spoon:golden-spoon /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build --chown=golden-spoon:golden-spoon /app/packages/shared/src ./packages/shared/src
COPY --from=build --chown=golden-spoon:golden-spoon /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
USER golden-spoon
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
