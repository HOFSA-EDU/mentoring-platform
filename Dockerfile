# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
ENV NEXT_TELEMETRY_DISABLED=1

# Install from the lockfile on Linux; never copy host node_modules.
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM dependencies AS builder
COPY . .
# Module initialization validates these values during the build. These are
# deliberately non-secret placeholders, scoped to this command only.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    AUTH_SECRET=build-only-placeholder-not-a-runtime-secret \
    npm run build

# Prisma CLI and administrative tooling stay out of the web image.
FROM dependencies AS tools
ENV NODE_ENV=production
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts tsconfig.json ./
COPY --chown=node:node src/lib/env.ts ./src/lib/env.ts
COPY --chown=node:node src/modules/admin/domain/schemas.ts ./src/modules/admin/domain/schemas.ts
COPY --chown=node:node src/modules/auth/infrastructure/password.ts ./src/modules/auth/infrastructure/password.ts
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run db:generate
USER node
CMD ["npm", "run", "db:deploy"]

# The default final image contains only Next.js' traced runtime and static files.
FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(4000) }).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
