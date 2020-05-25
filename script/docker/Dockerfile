FROM nginx
MAINTAINER tengjiqi@gmail.com
EXPOSE 80

# 将静态资源拷入镜像
RUN mkdir -p /opt/oms-console
COPY dist /opt/oms-console/dist
# 修改 nginx 配置文件
RUN rm -rf /etc/nginx/conf.d/*
COPY nginx.my.conf /etc/nginx/conf.d/
