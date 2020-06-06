#!/bin/sh

# 在根目录运行该脚本文件，自动替换 oms-server 的静态文件

npm run build_spring
rm -rf ../OhMyScheduler/oh-my-scheduler-server/src/main/resources/static/*
mv dist/* ../OhMyScheduler/oh-my-scheduler-server/src/main/resources/static/

