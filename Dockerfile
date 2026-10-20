# syntax=docker/dockerfile:1

FROM node:26-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
ARG VITE_GO2RTC_PUBLIC_URL=
ENV VITE_GO2RTC_PUBLIC_URL=$VITE_GO2RTC_PUBLIC_URL
RUN npm run build

FROM node:26-bookworm-slim AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/ ./
RUN npm run build

FROM node:26-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev
COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./public
EXPOSE 8080
USER node
CMD ["node", "dist/index.js"]
