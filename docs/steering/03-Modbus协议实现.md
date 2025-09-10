# DDSUViewer Modbus RTU 协议实现

## 协议概述

DDSUViewer 实现了完整的 Modbus RTU 协议栈，专门针对 DDSU666 单相电子式电能表进行了优化。该实现支持标准的 Modbus RTU 通信协议，包括帧格式、CRC 校验、异常处理等核心功能。

## Modbus RTU 帧格式

### 标准帧结构
```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  从站地址   │   功能码    │   数据域    │   CRC低位   │   CRC高位   │
│   1 字节    │   1 字节    │   N 字节    │   1 字节    │   1 字节    │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### 读保持寄存器请求帧 (功能码 0x03)
```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  从站地址   │   0x03      │  起始地址   │  寄存器数量 │   CRC低位   │   CRC高位   │
│   1 字节    │   1 字节    │   2 字节    │   2 字节    │   1 字节    │   1 字节    │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### 读保持寄存器响应帧
```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  从站地址   │   0x03      │  字节计数   │   数据      │   CRC低位   │   CRC高位   │
│   1 字节    │   1 字节    │   1 字节    │   N 字节    │   1 字节    │   1 字节    │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

## 核心实现

### 1. 帧构造函数

```go
// BuildReadFrame 构造读寄存器帧
func BuildReadFrame(slaveID byte, startAddr uint16, quantity uint16) []byte {
    frame := make([]byte, 8)
    frame[0] = slaveID                                    // 从站地址
    frame[1] = FunctionReadHoldingRegisters              // 功能码 0x03
    binary.BigEndian.PutUint16(frame[2:4], startAddr)   // 起始地址 (大端序)
    binary.BigEndian.PutUint16(frame[4:6], quantity)    // 寄存器数量 (大端序)
    
    crc := CalculateCRC16(frame[:6])                     // 计算前6字节的CRC
    binary.LittleEndian.PutUint16(frame[6:8], crc)      // CRC (小端序)
    
    return frame
}
```

**关键点**:
- 地址和数量使用大端序 (Big-Endian)
- CRC 使用小端序 (Little-Endian)
- 帧长度固定为 8 字节

### 2. 响应解析函数

```go
// ParseResponse 解析响应帧
func ParseResponse(data []byte) (*Frame, error) {
    if len(data) < 5 {
        return nil, fmt.Errorf("响应帧长度不足")
    }

    frame := &Frame{
        SlaveID:  data[0],
        Function: data[1],
    }

    // 检查异常响应 (功能码最高位为1)
    if frame.Function&0x80 != 0 {
        if len(data) < 5 {
            return nil, fmt.Errorf("异常响应帧长度不足")
        }
        frame.Data = data[2:3] // 异常码
        frame.CRC = binary.LittleEndian.Uint16(data[3:5])
        return frame, fmt.Errorf("Modbus异常响应: %02X", data[2])
    }

    // 正常响应处理
    byteCount := data[2]
    if len(data) < int(3+byteCount+2) {
        return nil, fmt.Errorf("响应帧数据长度不足")
    }

    frame.Data = data[3 : 3+byteCount]
    frame.CRC = binary.LittleEndian.Uint16(data[3+byteCount : 3+byteCount+2])

    // CRC 校验
    expectedCRC := CalculateCRC16(data[:3+byteCount])
    if frame.CRC != expectedCRC {
        return nil, fmt.Errorf("CRC校验失败")
    }

    return frame, nil
}
```

### 3. CRC16 校验算法

```go
// CalculateCRC16 计算CRC16校验码 (Modbus标准)
func CalculateCRC16(data []byte) uint16 {
    crc := uint16(0xFFFF)  // 初始值
    
    for _, b := range data {
        crc ^= uint16(b)   // 异或操作
        for i := 0; i < 8; i++ {
            if crc&0x0001 != 0 {
                crc = (crc >> 1) ^ 0xA001  // 多项式 0xA001
            } else {
                crc >>= 1
            }
        }
    }
    
    return crc
}
```

**CRC16 算法特点**:
- 初始值: 0xFFFF
- 多项式: 0xA001 (反向)
- 标准 Modbus CRC16 算法

## DDSU666 特定实现

### 1. 寄存器地址映射

```go
const (
    RegVoltage       = 0x2000  // 电压 U (V)
    RegCurrent       = 0x2002  // 电流 I (A)  
    RegActivePower   = 0x2004  // 有功功率 P (W)
    RegReactivePower = 0x2006  // 无功功率 Q (VAR)
    RegApparentPower = 0x2008  // 视在功率 S (VA)
    RegPowerFactor   = 0x200A  // 功率因数 PF
    RegFrequency     = 0x200E  // 频率 Freq (Hz)
    RegActiveEnergy  = 0x4000  // 有功总电能 Ep (kWh)
)
```

### 2. 数据类型处理

DDSU666 使用 IEEE754 单精度浮点数格式，但采用特殊的字节序：

```go
// ParseFloat32 解析DDSU666的IEEE754浮点数
// DDSU666使用"字交换小端序"(Word-Swapped Little-Endian)
func ParseFloat32(data []byte) float32 {
    if len(data) < 4 {
        return 0
    }
    
    // 字节重排: [Reg1_Hi, Reg1_Lo, Reg2_Hi, Reg2_Lo] 
    //        -> [Reg1_Lo, Reg1_Hi, Reg2_Lo, Reg2_Hi]
    bytes := make([]byte, 4)
    bytes[0] = data[1]  // 第一个寄存器低字节
    bytes[1] = data[0]  // 第一个寄存器高字节  
    bytes[2] = data[3]  // 第二个寄存器低字节
    bytes[3] = data[2]  // 第二个寄存器高字节
    
    bits := binary.LittleEndian.Uint32(bytes)
    return math.Float32frombits(bits)
}
```

**字节序说明**:
- 标准 IEEE754: [B0, B1, B2, B3]
- DDSU666 传输: [B1, B0, B3, B2]
- 需要重新排列后解析

### 3. 批量读取优化

```go
// 优化的寄存器读取策略
func (p *Poller) readElectricalRegisters() *registers.ElectricalData {
    regData := make(map[uint16][]byte)

    // 从 0x2000 连续读取 16 个寄存器 (覆盖 0x2000-0x200F)
    data := p.readRegistersWithRetry(registers.RegVoltage, 16)
    if data != nil && len(data) >= 32 {
        // 解析各个数据点 (每个数据点占4字节)
        regData[registers.RegVoltage] = data[0:4]        // 0x2000
        regData[registers.RegCurrent] = data[4:8]        // 0x2002  
        regData[registers.RegActivePower] = data[8:12]   // 0x2004
        regData[registers.RegReactivePower] = data[12:16] // 0x2006
        regData[registers.RegApparentPower] = data[16:20] // 0x2008
        regData[registers.RegPowerFactor] = data[20:24]   // 0x200A
        // 跳过 0x200C (保留地址)
        regData[registers.RegFrequency] = data[28:32]     // 0x200E
    }

    return registers.ParseElectricalData(regData)
}
```

**优化策略**:
- 单次读取多个连续寄存器
- 减少通信次数提高效率
- 跳过保留地址避免错误

## 通信参数配置

### 1. 串口参数

```go
type Config struct {
    Port     string              // COM端口
    BaudRate int                 // 波特率
    DataBits int                 // 数据位
    StopBits serial.StopBits     // 停止位
    Parity   serial.Parity       // 校验位
}

// DDSU666 推荐配置
defaultConfig := Config{
    Port:     "COM1",
    BaudRate: 9600,              // 默认波特率
    DataBits: 8,                 // 8位数据位
    StopBits: serial.OneStopBit, // 1位停止位
    Parity:   serial.NoParity,   // 无校验
}
```

### 2. 从站地址配置

```go
// 从站地址范围: 1-247 (0x01-0xF7)
// DDSU666 默认地址: 12 (0x0C)
type SerialConfig struct {
    SlaveID int  // 从站地址 (十进制)
}

// 十六进制输入转换
func parseSlaveID(hexStr string) (int, error) {
    id, err := strconv.ParseInt(hexStr, 16, 8)
    if err != nil {
        return 0, err
    }
    if id < 1 || id > 247 {
        return 0, fmt.Errorf("从站地址超出范围 (01-F7)")
    }
    return int(id), nil
}
```

## 错误处理机制

### 1. 异常响应码

```go
const (
    ExceptionIllegalFunction    = 0x01  // 非法功能码
    ExceptionIllegalDataAddr    = 0x02  // 非法数据地址
    ExceptionIllegalDataValue   = 0x03  // 非法数据值
    ExceptionSlaveDeviceFailure = 0x04  // 从站设备故障
    ExceptionAcknowledge        = 0x05  // 确认
    ExceptionSlaveDeviceBusy    = 0x06  // 从站设备忙
    ExceptionMemoryParityError  = 0x08  // 存储奇偶性差错
)

func parseExceptionCode(code byte) string {
    switch code {
    case ExceptionIllegalFunction:
        return "非法功能码"
    case ExceptionIllegalDataAddr:
        return "非法数据地址"
    case ExceptionIllegalDataValue:
        return "非法数据值"
    case ExceptionSlaveDeviceFailure:
        return "从站设备故障"
    case ExceptionSlaveDeviceBusy:
        return "从站设备忙"
    default:
        return fmt.Sprintf("未知异常码: 0x%02X", code)
    }
}
```

### 2. 重试机制

```go
// 带重试的寄存器读取
func (p *Poller) readRegistersWithRetry(startAddr uint16, quantity uint16) []byte {
    maxRetries := 3
    timeout := 200 * time.Millisecond

    for retry := 0; retry < maxRetries; retry++ {
        data, err := p.readRegisters(startAddr, quantity, timeout)
        if err == nil {
            return data
        }

        // 记录重试信息
        log.Printf("读取寄存器失败 (重试 %d/%d): %v", retry+1, maxRetries, err)
        
        // 重试前等待
        if retry < maxRetries-1 {
            time.Sleep(50 * time.Millisecond)
        }
    }

    return nil
}
```

### 3. 超时控制

```go
// 带超时的数据读取
func (c *Connection) ReadWithTimeout(buffer []byte, timeout time.Duration) (int, error) {
    c.mutex.Lock()
    defer c.mutex.Unlock()

    if !c.isOpen {
        return 0, fmt.Errorf("串口未打开")
    }

    c.port.SetReadTimeout(timeout)
    return c.port.Read(buffer)
}
```

## 性能优化

### 1. 轮询策略

```go
// 分层轮询策略
func (p *Poller) Start() error {
    // 启动电参量数据轮询 (1秒周期)
    go p.pollElectricalData()
    
    // 启动电能数据轮询 (10秒周期)  
    go p.pollEnergyData()
    
    return nil
}
```

**轮询频率设计**:
- 电参量数据: 1秒 (实时性要求高)
- 电能数据: 10秒 (变化缓慢)
- 避免过度轮询影响设备性能

### 2. 数据缓存

```go
type Poller struct {
    lastData  *registers.ElectricalData
    dataMutex sync.RWMutex
}

// 缓存最新数据，减少重复解析
func (p *Poller) updateData(newData *registers.ElectricalData) {
    p.dataMutex.Lock()
    defer p.dataMutex.Unlock()
    
    if p.lastData != nil {
        // 保留电能累计值
        newData.ActiveEnergy = p.lastData.ActiveEnergy
    }
    p.lastData = newData
}
```

### 3. 通信优化

- **批量读取**: 一次读取多个连续寄存器
- **智能重试**: 根据错误类型决定重试策略
- **超时控制**: 避免长时间阻塞
- **连接复用**: 保持串口连接避免频繁开关

## 调试和诊断

### 1. 通信日志

```go
func logModbusFrame(direction string, data []byte) {
    log.Printf("[%s] Modbus帧: % X", direction, data)
}

// 发送请求时记录
logModbusFrame("发送", frame)

// 接收响应时记录  
logModbusFrame("接收", buffer[:n])
```

### 2. 数据验证

```go
// 数据有效性检查
func IsValidFloat32(value float32) bool {
    return !math.IsNaN(float64(value)) && !math.IsInf(float64(value), 0)
}

// 范围检查
func validateElectricalData(data *ElectricalData) error {
    if data.Voltage < 0 || data.Voltage > 1000 {
        return fmt.Errorf("电压值异常: %.2f", data.Voltage)
    }
    if data.Frequency < 45 || data.Frequency > 65 {
        return fmt.Errorf("频率值异常: %.2f", data.Frequency)
    }
    return nil
}
```

### 3. 错误统计

```go
type Statistics struct {
    TotalRequests    int64
    SuccessRequests  int64  
    FailedRequests   int64
    TimeoutErrors    int64
    CRCErrors        int64
}

func (s *Statistics) RecordSuccess() {
    atomic.AddInt64(&s.TotalRequests, 1)
    atomic.AddInt64(&s.SuccessRequests, 1)
}

func (s *Statistics) RecordError(errType string) {
    atomic.AddInt64(&s.TotalRequests, 1)
    atomic.AddInt64(&s.FailedRequests, 1)
    
    switch errType {
    case "timeout":
        atomic.AddInt64(&s.TimeoutErrors, 1)
    case "crc":
        atomic.AddInt64(&s.CRCErrors, 1)
    }
}
```