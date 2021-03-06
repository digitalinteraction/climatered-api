# [0] A common base for both stages
FROM node:12-alpine as base
WORKDIR /app
RUN apk add --no-cache git
COPY ["package*.json", "tsconfig.json", "/app/"]

# [1] A builder to install modules and run a build
FROM base as builder
ENV NODE_ENV development
RUN npm ci
COPY src /app/src
COPY i18n /app/i18n
RUN npm run build -s &> /dev/null

# [2] From the base again, install production deps and copy compilled code
FROM base as dist
EXPOSE 3000
ENV NODE_ENV production
RUN npm ci
COPY i18n /app/i18n
COPY --from=builder /app/dist /app/dist
ENTRYPOINT [ "node", "dist/cli.js" ]
CMD ["serve"]
