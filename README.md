# DDSUViewer

DDSU666 单相电子式电能表上位机

## 功能特性

- 实时监控电压、电流、功率、频率等电参量
- 支持 Modbus RTU 协议通信
- 自动检测 COM 端口
- 可配置串口参数和从站地址
- 现代化界面设计

## 技术栈

- **后端**: Go 1.23 + Wails v2
- **前端**: React 18 + TypeScript + Chakra UI

## 快速开始

```bash
# 克隆项目
git clone https://github.com/ChuwuYo/DDSUViewer.git
cd DDSUViewer

# 安装依赖
go mod tidy
cd frontend && npm install && cd ..

# 开发模式
wails dev

# 构建
wails build

# 带版本号构建
wails build -ldflags="-X main.Version=1.0.0"

# 压缩构建
wails build -ldflags="-s -w" -upx
```

## 使用说明

1. 连接 DDSU666 电能表到 RS485 接口
2. 启动应用，选择 COM 端口
3. 设置从站地址（十六进制，如：0C）
4. 点击"打开串口"开始数据采集

## 支持的寄存器

| 参数 | 地址 | 单位 |
|------|------|------|
| 电压 | 0x2000 | V |
| 电流 | 0x2002 | A |
| 有功功率 | 0x2004 | W |
| 无功功率 | 0x2006 | VAR |
| 视在功率 | 0x2008 | VA |
| 功率因数 | 0x200A | - |
| 频率 | 0x200E | Hz |
| 有功总电能 | 0x4000 | kWh |

## 许可证

MIT License