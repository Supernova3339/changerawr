FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Copy the entire project
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1
ENV CI_BUILD_MODE 1
ENV DOCKER_BUILD 1

# Build the app
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install all dependencies to satisfy entrypoint requirements
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
# Install Prisma client with exact version match
RUN npm uninstall prisma @prisma/client --legacy-peer-deps
RUN npm install prisma@6.3.1 @prisma/client@6.3.1 --legacy-peer-deps
# Install tsx explicitly
RUN npm install -g tsx

# Install esbuild for widget
RUN npm install esbuild --legacy-peer-deps

# Install JSDOC
RUN npm install -g jsdoc

# Add bash for the entry script
RUN apk add --no-cache bash

# Copy the entire project from the builder stage
COPY --from=builder /app .

# Copy maintenance page and server script
COPY scripts/maintenance/index.html ./index.html
COPY scripts/maintenance/server.js ./scripts/maintenance/server.js

# Ensure the entrypoint script is executable
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Use entrypoint for running the build scripts before starting the server
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]