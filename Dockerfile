FROM node:22-alpine

WORKDIR /app

# Копируем манифесты зависимостей
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копируем исходный код
COPY . .

# Сборка фронтенда
RUN npm run build

# Порт приложения
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Запуск сервера
CMD ["npx", "tsx", "server.ts"]
