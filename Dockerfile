FROM node:22-alpine AS build
WORKDIR /app
COPY package.json .npmrc ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY server.mjs ./
COPY server/github-callback.mjs server/static-path.mjs server/public-config.mjs ./server/
COPY --from=build /app/dist ./dist
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
