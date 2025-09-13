FROM node:20-alpine as builder
WORKDIR /app

COPY front ./front
WORKDIR /app/front
RUN npm install && npm run build

FROM node:20-alpine as runner
WORKDIR /app

COPY backend ./backend
COPY --from=builder /app/front/dist ./backend/public

COPY scripts ./scripts
RUN chmod +x ./scripts/backup_mongo.sh

WORKDIR /app/backend
RUN npm install

EXPOSE 3000

CMD sh -c "node server.js"



