# PowerJob Console

<p align="center">
  <strong>PowerJob 分布式调度与计算框架 —— 官方控制台前端</strong>
</p>

<p align="center">
  <a href="https://github.com/PowerJob/PowerJob"><img src="https://img.shields.io/badge/PowerJob-Console-4A90D9?style=flat-square" alt="PowerJob"></a>
  <a href="https://www.yuque.com/powerjob/guidence"><img src="https://img.shields.io/badge/docs-语雀-blue?style=flat-square" alt="Docs"></a>
  <a href="https://github.com/PowerJob/PowerJob/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-green?style=flat-square" alt="License"></a>
</p>

---

## 简介

PowerJob Console 是 [PowerJob](https://github.com/PowerJob/PowerJob) 的官方 Web 控制台前端项目，为开发者提供任务与工作流的可视化管理和监控能力。

### 主要功能

- **任务管理**：任务的创建、编辑、启停、执行记录与日志查看
- **工作流（DAG）**：可视化编排工作流、配置节点依赖与参数、查看实例与运行详情
- **实例监控**：任务/工作流实例列表、状态追踪、日志白屏化
- **容器与模板**：容器化任务与模板管理
- **系统管理**：命名空间、应用、用户与权限、系统配置

### 技术栈

| 类别     | 技术 |
|----------|------|
| 框架     | Vue 3、Vue Router、Vuex |
| UI       | Element Plus、Tailwind CSS |
| 构建     | Vite 7 |
| 工作流编辑 | React + @powerjob/power-workflow-next、@xyflow/react |
| 编辑器   | Monaco Editor |
| 国际化   | Vue I18n |

---

## 环境要求

- **Node.js** >= 18（推荐 LTS）
- **npm** >= 9 或 **pnpm** / **yarn**
- 本地或远程可用的 **PowerJob Server**（默认 `http://localhost:7700`）

---

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

使用 `.env.dev`，前端默认运行在 `http://localhost:8080`，API 请求通过 Vite 代理到 `http://localhost:7700`：

```bash
npm run serve
# 或
npm run dev
```

### 生产构建

使用 `.env.product`，输出到 `dist/`：

```bash
npm run build
```

### 内嵌 Spring Boot 构建

使用 `.env.spring`，请求基路径为 `/`，适用于将前端打包并内置于 PowerJob Server（Spring Boot）中：

```bash
npm run build_spring
```

### 预览构建产物

```bash
npm run preview
```

---

## 项目结构（简要）

```
PowerJob-Console/
├── src/
│   ├── components/     # 页面与通用组件
│   │   ├── views/      # 业务视图（任务、工作流、实例等）
│   │   ├── dag/        # 工作流 DAG 编辑与实例详情
│   │   ├── admin/      # 系统管理相关
│   │   ├── bar/        # 侧边栏、导航栏
│   │   └── common/     # 公共组件
│   ├── i18n/           # 国际化（中/英）
│   ├── router.js       # 路由
│   ├── store.js        # Vuex 状态
│   └── main.js         # 入口
├── .env.dev            # 开发环境变量
├── .env.product        # 生产环境变量
├── .env.spring         # 内嵌 Spring Boot 环境变量
└── vite.config.ts     # Vite 配置
```

---

## 文档与资源

- **PowerJob 官方文档**：[https://www.yuque.com/powerjob/guidence](https://www.yuque.com/powerjob/guidence)
- **主仓库**：[PowerJob/PowerJob](https://github.com/PowerJob/PowerJob)
- **在线试用**：[try.powerjob.tech](http://try.powerjob.tech/#/welcome?appName=powerjob-agent-test&password=123)

---

## 许可证

与 PowerJob 主项目一致，采用 [Apache License 2.0](https://github.com/PowerJob/PowerJob/blob/master/LICENSE)。

---

## 贡献

欢迎通过 Issue 与 Pull Request 参与改进。请先阅读主仓库的贡献说明与代码规范。
