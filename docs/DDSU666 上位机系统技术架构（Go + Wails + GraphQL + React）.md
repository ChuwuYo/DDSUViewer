# 🧱 DDSU666 上位机系统技术架构（Go + Wails + GraphQL + React + Vite）

---

## ✅ 框架总览

- **前端**：React 18.3 + TypeScript + Vite + TailwindCSS + ShadcnUI  
- **后端**：Go + GraphQL（gqlgen）+ 串口通信（Modbus RTU）  
- **桌面封装**：Wails（Go + WebView2，支持系统托盘、窗口管理、文件对话框等）

---

## ✅ 前端技术栈（推荐集成方式）

> 基于 **Wails 官方 `react-ts` 模板**，手动升级为现代前端栈。

### 初始化步骤

1. 创建项目并进入前端目录  
   
   ```bash
   wails init -n ddsu666-client -t react-ts
   cd ddsu666-client/frontend
   ```

2. 升级 React 与 TypeScript（修改 `package.json` 的依赖）  
    建议把核心依赖升级到稳定的现代版本，例如：
   
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

3. 安装 Vite 并替换构建脚本（将前端切换为 Vite 构建）  
    安装 Vite：
   
   ```bash
   npm install --save-dev vite
   ```
   
    并在 `package.json` 中修改脚本：
   
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview"
   }
   ```

4. 添加 TailwindCSS 与 ShadcnUI  
    安装并初始化 Tailwind 与 ShadcnUI：
   
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   npx shadcn-ui init
   npx shadcn-ui add button card dialog table input
   ```
   
    在 `tailwind.config.js` 的 `content` 中包含前端源文件路径与 shadcn 模块路径：
   
   ```js
   module.exports = {
     content: [
       "./src/**/*.{ts,tsx,js,jsx}",
       "./index.html",
       "./node_modules/@shadcn/ui/**/*.js"
     ],
     theme: { extend: {} },
     plugins: []
   }
   ```

5. 集成 GraphQL 客户端（Apollo 或 urql）  
    推荐使用 Apollo 或 urql，根据你团队偏好选择：
   
   ```bash
   npm install @apollo/client graphql
   # 或者
   npm install urql graphql
   ```

---

## ✅ 后端服务（Go）

- **串口通信**：使用 `go.bug.st/serial` 实现 RS485 串口，支持 9600 8N1（也允许配置其他波特率）。
- **Modbus RTU 协议处理**：
  - 帧构造（地址、功能码、起始寄存器、寄存器数量、CRC16）
  - CRC16（标准 Modbus CRC，低字节在前）生成与校验
  - 功能码支持：0x03（读寄存器）、0x10（写多寄存器）
- **协议探测机制**：
  - 初次连接发送标准 Modbus 测试帧（0x03 读取常用寄存器）
  - 若无响应或响应异常，尝试 DL/T645 帧头探测
  - 若确认非 Modbus RTU，提示用户并提供切换选项
- **GraphQL 接口（gqlgen）**：
  - **Query**：读取当前电参量、设备状态、配置
  - **Mutation**：修改串口参数、从站地址、开始/停止采集等
  - **Subscription**：实时推送电参量（基于 WebSocket）
    - 后端实现建议用 `goroutine` + `channel` 做异步推送
    - 使用 `nhooyr.io/websocket`（或其它稳定库）结合内部 pubsub 管理订阅者（避免 gqlgen 阻塞 resolver 问题）
    - 支持多订阅者、按设备/数据点过滤推送、带时间戳与状态码
- **配置管理**：使用 `spf13/viper` 加载 YAML/ENV 配置，支持运行时热更新（配置变更回调）
- **日志记录**：使用 `rs/zerolog`，分类记录：
  - 原始 Modbus 读写帧（HEX）
  - CRC 校验结果、超时与重试统计
  - Modbus 异常码/错误码与用户操作记录（串口切换、波特率修改）
- **本地存储**：使用 SQLite（`gorm` 或 `sqlc`）记录历史数据、采集日志与告警（索引按时间与设备）
- **错误与重试策略**：
  - 超时建议 100–300 ms，重试 2–3 次后上报
  - CRC 错误直接丢弃帧并记录
  - 连续 N 次失败将设备/通道标为异常并触发告警

---

## ✅ 页面功能模块（前端）

- **实时仪表盘**：
  
  - 显示：电压、电流、有功/无功功率、视在功率、功率因数、频率、有功总电能等
  - 支持两种刷新策略：
    - **Subscription（首选）**：通过 GraphQL Subscription（WebSocket）实时推送
    - **Fallback（备用）**：REST 轮询（1s 或可配置）用于网络受限或 WebSocket 不可用时
  - 图表：使用轻量图表（如 Recharts 或 ECharts）展示实时曲线与历史回放

- **串口配置界面**：
  
  - 支持：波特率、数据位、停止位、校验位、从站地址等设置（通过 Mutation 写入）
  - **自动扫描**：
    - 枚举本机可用 COM/TTY 端口
    - 尝试常用波特率（1200/2400/4800/9600）发送测试帧
    - 若识别设备则自动填写推荐参数并提示用户确认

- **状态监控**：
  
  - 串口连接状态（连接/未连接/异常）
  - 协议识别状态（Modbus / DL/T645 / Unknown）
  - 数据接收延迟与丢帧统计（展示最近 N 次成功/失败率）
  - 设备健康（最近心跳、错误计数）

- **日志查看与导出**：
  
  - 实时日志流（通信帧、解析结果、错误）
  - 支持按时间/设备/级别过滤
  - 导出为 CSV 或 JSON（前端实现导出功能）

- **用户体验**：
  
  - 配置保存到本地并可导出/导入
  - 仪表盘支持自定义面板（用户选择显示字段）
  - 错误提示明确（如 CRC 错误、超时、非法功能/地址）

---

## 🖥️ 桌面封装方式（Wails）

- 使用 Wails 封装应用为跨平台桌面程序（Windows/macOS/Linux）
- 前端作为 Wails UI 层，推荐使用 Vite 构建后的静态资源与 Wails 集成
- 后端 Go 运行在同一个应用进程内部，提供同步/异步方法供前端调用
- 支持功能：
  - 系统托盘（最小化到托盘、显示菜单项）
  - 文件对话框（导入/导出配置、导出日志）
  - 多窗口（主界面 + 设置/日志窗口）
  - 后台运行与开机自启（平台特性实现）
- **方法绑定建议**：
  - 使用 Wails 内置 `Bind()` API 绑定后端方法，而非手写 `wails_bindings.go`
  - 前端直接调用自动生成的 TypeScript API
  - 如果需要封装，前端可在 `@/wails` 建立统一调用层，集中处理异常、超时、类型推导

---

## 📦 模块划分建议（后端）

| 模块名                 | 描述                               |
| ------------------- | -------------------------------- |
| `serial`            | 串口读写封装、端口枚举、半双工控制（RTS/DE 控制）     |
| `modbus`            | 帧构造、CRC16 校验、功能码处理、异常码解释         |
| `registers`         | DDSU666 寄存器映射、数据点抽象、字节序/端序转换     |
| `poller`            | 周期轮询、合并读取策略、轮转调度、多从站支持           |
| `protocol_detector` | 协议探测与识别（Modbus / DL/T645 / 其它）   |
| `parser`            | 浮点解码、异常数据过滤（NaN/Inf/突变剔除）        |
| `config`            | 配置加载（viper）、热更新、默认与覆盖策略          |
| `logger`            | 统一日志接口、日志分级、文件与旋转策略              |
| `graphql`           | gqlgen schema、resolver、权限与限流（如需） |
| `pubsub`            | Subscription 管理、发布/订阅、消息分发       |
| `storage`           | SQLite（或可选 Timeseries DB）持久化与查询  |
| `wails_bridge`      | Wails 与后端接口桥接、方法暴露与安全边界          |

---

## 🔒 安全与稳定性考量

- **本地权限**：访问串口需要 OS 权限，安装说明中提醒用户授予权限（Linux 下 dialout 组等）
- **并发与互斥**：串口访问需要单一写入入口，使用互斥锁或串口专用 goroutine 避免并发写
- **资源回收**：应用退出或切换设备时确保关闭串口并清理 goroutine
- **数据完整性**：在写配置（写寄存器）前进行校验与二次确认，避免误写导致设备异常
- **错误隔离**：通信异常应限于当前设备通道，不影响其他设备的轮询

---

## 🔮 后续扩展建议

- 支持**多从站轮询与动态调度**（优先队列、退避策略）  
- 支持 **MQTT** 推送到物联网平台（作为云同步/数据上报通道）  
- 支持 **历史数据存储** 与图表分析（本地 SQLite + 前端图表回放）  
- 支持 **Web UI 权限管理**（若多人使用，增加用户登录与权限）  
- 支持 **设备固件/配置 OTA**（可选，需设备侧配合）  
- 支持 **导出/备份/恢复** 配置与历史数据
