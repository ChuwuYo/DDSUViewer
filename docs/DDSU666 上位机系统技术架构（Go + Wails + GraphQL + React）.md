# 🧱 DDSU666 上位机系统技术架构（Go + Wails + GraphQL + React + Vite）

---

## ✅ 框架总览

- **前端**：React 18.3 + TypeScript + Vite + Hero UI  
- **后端**：Go + GraphQL（gqlgen）+ 串口通信（Modbus RTU）  
- **桌面封装**：Wails（Windows 平台，基于 WebView2）

---

## ✅ 前端技术栈（集成说明）

> 项目根目录为 `DDSUViewer`，前端位于 `frontend/`，构建输出为 `frontend/dist/`。组件建议：使用 Hero UI 提供的现成组件（如卡片、表格、输入框），避免重复造轮子。

### 核心配置步骤

1. 升级 React 与 TypeScript  
   修改 `frontend/package.json`：
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

2. 安装 Vite 并替换构建脚本  
   ```bash
   npm install --save-dev vite
   ```

   修改 `frontend/package.json`：
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview"
   }
   ```

3. 集成 Hero UI  
   按照 [Hero UI 官方安装指南](https://www.heroui.com/docs/guide/installation) 进行配置：

   - 安装主库：
     ```bash
     npm install @heroui/react
     ```

   - 添加组件（如 Card、Input、Table）：
     ```bash
     npx heroui add card input table
     ```

   - 在 `frontend/src/main.tsx` 中包裹 `HeroUIProvider`：
     ```tsx
     import { HeroUIProvider } from "@heroui/react";

     function App() {
       return (
         <HeroUIProvider>
           {/* 你的组件 */}
         </HeroUIProvider>
       );
     }
     ```

4. 集成 GraphQL 客户端（Apollo 或 urql）  
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
- 错误与重试策略：
  - 超时建议 100–300 ms，重试 2–3 次
  - CRC 错误丢帧
  - 连续失败标记通道异常，触发顶部错误提示

---

## ✅ 页面功能模块（前端）

- 实时数据展示：
  - 显示电压、电流、功率、频率、电能等字段
  - 使用 Hero UI 提供的卡片或表格组件展示数值
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
| `graphql`          | gqlgen schema 与 resolver |
| `pubsub`           | Subscription 推送通道管理 |
| `wails_bridge`     | Wails 与前端通信桥接层

---

## 🔒 稳定性建议

- 串口访问需互斥，建议使用专用 goroutine 控制写入
- 应用退出时关闭串口并清理资源
- 写入配置前进行校验，避免误写导致设备异常
- 通信异常限于当前通道，不影响其他设备轮询
