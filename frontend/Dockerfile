# Build the Angular app, then serve the static files with Caddy.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM caddy:2-alpine
COPY --from=build /app/dist/product-search-frontend/browser /srv
