# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve with vite preview (provides server-side auth header injection)
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY --from=builder /app/dist ./dist
COPY vite.config.ts tsconfig*.json ./

ENV OPENHAB_URL=http://openhab:8080
ENV OPENHAB_TOKEN=""

EXPOSE 5180
CMD ["npx", "vite", "preview"]
