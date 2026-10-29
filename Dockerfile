# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# 1. Базовый образ (Base)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm install --legacy-peer-deps

# -----------------------------------------------------------------------------
# 2. Образ для локальной разработки и тестов (Development / Testing)
# -----------------------------------------------------------------------------
FROM base AS dev
WORKDIR /app

ENV NODE_ENV=development
ENV PORT=3000

# Копируем проект (при монтировании томов в docker-compose данные будут синхронизироваться вживую)
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# -----------------------------------------------------------------------------
# 3. Сборка фронтенда (Builder)
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# 4. Продакшен образ (Production)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS prod
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Устанавливаем только production-зависимости (включая tsx)
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Копируем скомпилированный фронтенд из builder
COPY --from=builder /app/dist ./dist

# Копируем статические ассеты (игры, Ruffle, звуки), конфиг и сервер
COPY --from=builder /app/public ./public
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/server.ts ./server.ts

EXPOSE 3000

CMD ["./node_modules/.bin/tsx", "server.ts"]
