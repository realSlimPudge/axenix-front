# Stage 1: Сборка приложения
FROM node:21-alpine AS builder
WORKDIR /app

# Копируем файлы с зависимостями и устанавливаем их
COPY package*.json ./
RUN npm ci --only=production

# Копируем исходный код и строим приложение
COPY . .
RUN npm run build

# Stage 2: Запуск приложения
FROM node:21-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Копируем необходимые файлы из стадии сборки
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Если используете standalone режим (рекомендуется)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Если не используете standalone режим
# COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
# COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
