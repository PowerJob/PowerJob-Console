# 构建项目
npm run build
# 删除旧文件
rm -rf ../OhMyScheduler/oh-my-scheduler-server/src/main/resources/static/*
# 拷贝新文件
mv dist/* ../OhMyScheduler/oh-my-scheduler-server/src/main/resources/static/

