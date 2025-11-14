# Backend Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for all workspaces
COPY package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN npm install

COPY . .

RUN npm run build:backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/backend ./packages/backend

EXPOSE 5000
CMD ["npm", "--workspace", "packages/backend", "run", "start"]
