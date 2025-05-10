FROM node:20-alpine as builder

WORKDIR /app

COPY front .

RUN npm install

RUN npm run build

FROM node:20-alpine as runner

WORKDIR /app

COPY backend ./backend

COPY --from=builder /app/dist ./front/dist

WORKDIR /app/backend

RUN npm install

EXPOSE 3000

CMD ["node", "server.js"]


