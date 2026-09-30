ARG NGINX_IMAGE=nginx:stable-alpine
FROM ${NGINX_IMAGE}
EXPOSE 80
COPY dist/ /usr/share/nginx/html/
COPY script/docker/nginx.my.conf /etc/nginx/conf.d/default.conf
