FROM node:22-alpine AS build
WORKDIR /app
COPY package.json .npmrc ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY server.ts ./
COPY server/github-callback.ts server/static-path.ts server/public-config.ts ./server/
COPY --from=build /app/dist ./dist
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.ts"]
