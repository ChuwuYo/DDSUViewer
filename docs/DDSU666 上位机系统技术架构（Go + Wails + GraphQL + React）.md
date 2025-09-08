# 🧱 DDSU666 上位机系统技术架构（Go + Wails + GraphQL + React + Vite）

---

## ✅ 框架总览

- **前端**：React 18.3 + TypeScript + Vite + ShadcnUI 
- **后端**：Go + GraphQL（gqlgen）+ 串口通信（Modbus RTU）  
- **桌面封装**：Wails（Windows 平台，基于 WebView2）

---

## ✅ 前端技术栈（推荐集成方式）

> 基于 Wails 官方 `react-ts` 模板，手动升级为现代前端栈。组件建议：优先使用现有组件库（如 ShadcnUI）中的现成组件，避免重复造轮子。

### 初始化步骤

1. 创建项目并进入前端目录  
   ```bash
   wails init -n ddsu666-client -t react-ts -d .
   cd frontend
   ```

2. 升级 React 与 TypeScript  
   修改 `package.json`：
   ```json
   {
     "dependencies": {
       "react": "^18.3.1",
       "react-dom": "^18.3.1"
     },
     "devDependencies": {
       "typescript": "^5.5.4"
     }
   }
   ```

3. 安装 Vite 并替换构建脚本  
   ```bash
   npm install --save-dev vite
   ```

   修改 `package.json`：
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview"
   }
   ```

4. 添加 ShadcnUI
   ```bash
   npx shadcn-ui init
   npx shadcn-ui add button card input table
   ```

5. 集成 GraphQL 客户端（Apollo 或 urql）  
   ```bash
   npm install @apollo/client graphql
   # 或者
   npm install urql graphql
   ```

---

## ✅ 后端服务（Go）

- 串口通信：使用 `go.bug.st/serial` 实现 RS485 串口，支持 9600 8N1（可配置）
- Modbus RTU 协议处理：
  - 帧构造、CRC16 校验、功能码支持（0x03 / 0x10）
- 协议探测机制：
  - 初次发送标准 Modbus 测试帧
  - 若无响应，尝试 DL/T645 帧头探测
  - 若确认非 Modbus RTU，提示用户切换协议
- GraphQL 接口（gqlgen）：
  - Query：读取电参量、设备状态
  - Mutation：修改串口参数、启动/停止采集
  - Subscription：实时推送数据（WebSocket）
    - 使用 goroutine + channel 异步推送
    - 推荐使用 `nhooyr.io/websocket` + pubsub 管理订阅者
- 配置管理：使用 `spf13/viper` 加载 YAML/ENV，支持热更新
- 本地存储：使用 SQLite（`gorm` 或 `sqlc`）记录采集数据
- 错误与重试策略：
  - 超时建议 100–300 ms，重试 2–3 次
  - CRC 错误丢帧
  - 连续失败标记通道异常，触发顶部错误提示

---

## ✅ 页面功能模块（前端）

- 实时数据展示：
  - 显示电压、电流、功率、频率、电能等字段
  - 使用组件库中的现成表格或卡片组件展示数据
  - 不做复杂图表，仅展示字段名称与数值即可

- 串口配置界面：
  - 支持波特率、数据位、停止位、地址设置（通过 Mutation 写入）
  - 自动扫描：
    - 枚举 COM 端口
    - 轮询常见波特率，识别设备后填充推荐参数

- 状态监控：
  - 串口连接状态（连接/未连接）
  - 协议识别状态（Modbus / DL/T645）
  - 数据刷新延迟（可选）

- 错误提示：
  - 使用顶部弹窗组件提示 CRC 错误、超时、设备异常等

---

## 🖥️ 桌面封装方式（Wails）

- 平台：Windows（基于 WebView2）
- 前端构建：Vite 打包后自动集成至 Wails
- 方法绑定：
  - 使用 Wails `Bind()` API 暴露后端方法
  - 前端通过自动生成的 TypeScript API 调用
  - 推荐封装统一调用层处理异常与类型推导

---

## 📦 模块划分建议（后端）

| 模块名             | 描述 |
|--------------------|------|
| `serial`           | 串口读写封装 |
| `modbus`           | 帧构造、CRC、功能码处理 |
| `registers`        | 寄存器映射与数据点抽象 |
| `poller`           | 周期轮询与调度 |
| `protocol_detector`| 协议探测与识别 |
| `parser`           | 浮点解码与异常过滤 |
| `config`           | 配置加载与热更新 |
| `graphql`          | gqlgen schema 与 resolver |
| `pubsub`           | Subscription 推送通道管理 |
| `storage`          | SQLite 数据存储 |
| `wails_bridge`     | Wails 与前端通信桥接层

---

## 🔒 稳定性建议

- 串口访问需互斥，建议使用专用 goroutine 控制写入
- 应用退出时关闭串口并清理资源
- 写入配置前进行校验，避免误写导致设备异常
- 通信异常限于当前通道，不影响其他设备轮询
