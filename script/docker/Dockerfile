FROM nginx:stable-alpine
ENV POWERJOB_SERVER_URL=http://powerjob-server:7700
COPY dist/ /usr/share/nginx/html/
COPY script/docker/nginx.my.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
