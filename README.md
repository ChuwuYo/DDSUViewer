# DDSUViewer

一个基于 Wails 框架开发的桌面应用程序，使用 Go 作为后端，React + TypeScript 作为前端。

## 项目简介

DDSUViewer 是一个现代化的桌面应用程序，结合了 Go 的高性能后端和 React 的现代化前端界面。

## 技术栈

- **后端**: Go 1.23
- **前端**: React 18 + TypeScript + Vite
- **框架**: Wails v2
- **样式**: CSS3

## 开发环境

### 前置要求

- Go 1.23+
- Node.js 16+
- Wails CLI v2

### 安装依赖

```bash
# 安装 Go 依赖
go mod tidy

# 安装前端依赖
cd frontend
npm install
cd ..
```

### 开发模式

在项目根目录运行以下命令启动开发服务器：

```bash
wails dev
```

这将启动一个支持热重载的开发服务器。如果需要在浏览器中开发并访问 Go 方法，可以访问 http://localhost:34115。

### 构建应用

构建生产版本：

```bash
wails build
```

构建完成后，可执行文件将位于 `build/` 目录中。

## 项目结构

```
DDSUViewer/
├── app.go              # 应用程序主要逻辑
├── main.go             # 程序入口点
├── wails.json          # Wails 配置文件
├── go.mod              # Go 模块文件
├── frontend/           # 前端代码
│   ├── src/           # React 源代码
│   ├── dist/          # 构建输出
│   └── package.json   # 前端依赖
└── build/             # 构建输出目录
```

## 许可证

请查看 LICENSE 文件了解详细信息。

## 作者

ChuwuYo (141227996+ChuwuYo@users.noreply.github.com)
