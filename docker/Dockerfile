# Multi-stage Dockerfile for Nirmaya Backend
# Supports: development, production

# Use specific Node version with latest Alpine for security patches
# Check https://hub.docker.com/_/node for latest tags
ARG NODE_VERSION=22.16.0-alpine3.22

# ============================================
# Base Stage - Common setup
# ============================================
FROM node:${NODE_VERSION} AS base

# Update Alpine packages to get latest security fixes
RUN apk upgrade --no-cache

WORKDIR /app

# ============================================
# Dependencies Stage - Install all deps
# ============================================
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ============================================
# Production Dependencies - Only prod deps
# ============================================
FROM base AS prod-deps

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ============================================
# Build Stage - Compile TypeScript
# ============================================
FROM deps AS build

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ============================================
# Development Stage - For local dev with hot reload
# ============================================
FROM deps AS development

ENV NODE_ENV=development

# Source files mounted via volume in compose
COPY tsconfig.json nodemon.json ./

EXPOSE 8000

CMD ["npm", "run", "dev"]

# ============================================
# Production Stage - Minimal final image
# ============================================
FROM base AS production

ENV NODE_ENV=production

# Update packages, install curl for healthcheck and create non-root user
RUN apk upgrade --no-cache && \
    apk add --no-cache curl && \
    addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Copy only what's needed
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/build ./build
COPY --chown=nodejs:nodejs package.json ./

USER nodejs

EXPOSE 8000

# Healthcheck for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "build/server.js"]
