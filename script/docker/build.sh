#!/bin/sh
# -p：允许后面跟一个字符串作为提示 -r：保证读入的是原始内容，不会发生任何转义
read -r -p "请输入Dockedr镜像版本:" version
echo "即将构建的 oms-console 镜像：oms-console:$version"
read -r -p "任意键继续:"

# 一键部署脚本，请勿挪动脚本
cd `dirname $0`/../.. || exit

read -r -p "是否进行 npm 构建（y/n）:" neednpm
if [ "$neednpm" = "y" ] || [  "$neednpm" = "Y" ]; then
  rm -rf dist && rm -rf script/docker/dist
  echo "=============================== 安装依赖 ==============================="
  npm install
  echo "=============================== 构建dist ==============================="
  npm run build || exit
  sleep 5
  echo "=============================== 拷贝dist==============================="
  cp -r dist script/docker/dist
fi
echo "=============================== 停止应用 ==============================="
docker stop oms-console
echo "=============================== 删除旧容器 ==============================="
docker container rm oms-console:$version
echo "=============================== 删除旧镜像 ==============================="
docker rmi -f tjqq/oms-console:$version
echo "=============================== 构建新镜像 ==============================="
docker build -t tjqq/oms-console:$version script/docker/. || exit

echo "=============================== 启动应用 ==============================="
docker run -d -p 80:80 --name oms-console tjqq/oms-console:$version
