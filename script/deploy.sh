#!/bin/sh

# 在根目录运行该脚本文件，自动替换 oms-server 的静态文件

rm -rf dist
npm run build_spring
rm -rf ../PowerJob/powerjob-server/powerjob-server-starter/src/main/resources/static/*
mv dist/* ../PowerJob/powerjob-server/powerjob-server-starter/src/main/resources/static/

