# Frontend Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/backend/package.json ./packages/backend/
RUN npm install

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build:frontend

FROM nginx:1.26-alpine
WORKDIR /usr/share/nginx/html
COPY --from=base /app/packages/frontend/dist ./
COPY --from=base /app/packages/frontend/public/locales ./locales
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
