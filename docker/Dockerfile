### Builder
FROM node:14.20.0 AS builder

WORKDIR /app
# RUN npm config set registry https://registry.npmmirror.com

COPY package.json package.json
RUN npm install

COPY public public
COPY src src
COPY .env.product .env.product
RUN npm run build

### Runner
FROM openresty/openresty:alpine-apk AS runner
MAINTAINER "z.t.x@foxmail.com"

COPY --from=builder /app/dist /app/dist

ENV TZ=Asia/Shanghai
ENV API_HOST='127.0.0.1'
ENV API_PORT='7700'

COPY docker/default.conf /etc/nginx/conf.d/
COPY docker/env.main     /etc/nginx/conf.d/
COPY docker/api.lua      /etc/nginx/lua/

EXPOSE 80
