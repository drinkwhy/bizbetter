# Production image for Railway (or any Docker host). Data lives on a mounted volume, never in the image.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# Same pnpm major as local development; pnpm-workspace.yaml allowBuilds approves prisma/esbuild install scripts.
RUN npm install -g pnpm@11.7.0
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
RUN ./node_modules/.bin/prisma generate && ./node_modules/.bin/next build
ENV NODE_ENV=production
EXPOSE 3000
# Apply the Prisma schema to the volume database, then serve on Railway's $PORT.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec ./node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
