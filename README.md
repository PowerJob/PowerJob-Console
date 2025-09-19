# PowerJob-Console

分布式调度与计算框架——PowerJob 前端页面

项目文档：<https://www.yuque.com/powerjob/guidence>

# 命令

npm run serve（使用 .env.dev ，请求 localhost:7700）

npm run build（使用 .env.product）

npm run build_spring（使用 .env.spring，请求 /，构建内置于 SpringBoot 的 vue project）

# 使用容器启动

修改`docker-compose.yml`文件，将`API_HOST`和`API_PORT`两个环境变量设置为后端接口地址。

```bash
docker compose up -d --build
```
