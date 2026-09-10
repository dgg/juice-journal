ARG BUN_IMAGE_TAG=1.4.2-distroless
FROM oven/bun:${BUN_IMAGE_TAG} AS base
WORKDIR /usr/src/app

FROM base AS install
COPY package.json bun.lock /temp/prod/
WORKDIR /temp/prod
RUN ["bun", "install", "--frozen-lockfile", "--production"]

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production
USER nonroot
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "run", "src/backend/index.ts"]
