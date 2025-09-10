# DDSU666 Modbus 测试程序集合

## 概述

本文档保存了用于测试DDSU666电能表Modbus通信的各种测试程序代码，这些程序帮助我们验证了正确的通信协议和数据解析方法。

## 1. CRC16校验测试程序

```go
// test_crc.go
package main

import (
	"encoding/binary"
	"fmt"
)

func calculateCRC16(data []byte) uint16 {
	crc := uint16(0xFFFF)
	
	for _, b := range data {
		crc ^= uint16(b)
		for i := 0; i < 8; i++ {
			if crc&0x0001 != 0 {
				crc = (crc >> 1) ^ 0xA001
			} else {
				crc >>= 1
			}
		}
	}
	
	return crc
}

func main() {
	// 测试帧: 18 03 20 00 00 02
	data := []byte{0x18, 0x03, 0x20, 0x00, 0x00, 0x02}
	
	fmt.Printf("数据: % X\n", data)
	
	crc := calculateCRC16(data)
	fmt.Printf("CRC16: 0x%04X\n", crc)
	
	// 分别显示高低字节
	crcBytes := make([]byte, 2)
	binary.LittleEndian.PutUint16(crcBytes, crc)
	fmt.Printf("CRC字节 (小端序): %02X %02X\n", crcBytes[0], crcBytes[1])
	
	// 完整帧
	frame := append(data, crcBytes...)
	fmt.Printf("完整帧: % X\n", frame)
}
```

**测试结果**: 验证了CRC16计算正确，`18 03 20 00 00 02 CD C2`

## 2. 字节序验证程序

```go
// verify_voltage.go
package main

import (
	"encoding/binary"
	"fmt"
	"math"
)

func main() {
	// 设备返回的电压数据: 43 5E 80 00
	data := []byte{0x43, 0x5E, 0x80, 0x00}
	
	fmt.Printf("原始数据: % X\n", data)
	
	// 标准大端序解析
	bits := binary.BigEndian.Uint32(data)
	voltage := math.Float32frombits(bits)
	
	fmt.Printf("标准大端序解析: %.6f V\n", voltage)
	
	// 验证: 222.5V的IEEE754表示
	expected := float32(222.5)
	expectedBits := math.Float32bits(expected)
	expectedBytes := make([]byte, 4)
	binary.BigEndian.PutUint32(expectedBytes, expectedBits)
	
	fmt.Printf("222.5V的IEEE754表示: % X\n", expectedBytes)
}
```

**测试结果**: 确认了DDSU666使用IEEE754标准大端序格式

## 3. 多字节序对比测试程序

```go
// debug_modbus.go
package main

import (
	"encoding/binary"
	"fmt"
	"log"
	"math"
	"time"

	"go.bug.st/serial"
)

// 测试不同字节序的浮点数解析
func testByteOrders() {
	fmt.Println("=== 测试不同字节序解析 ===")
	
	// 模拟从设备读取的4字节数据
	testData := []byte{0x43, 0x5E, 0x80, 0x00}
	
	fmt.Printf("原始数据: %02X %02X %02X %02X\n", testData[0], testData[1], testData[2], testData[3])
	
	// 方式1: 标准大端序
	result1 := parseStandardBigEndian(testData)
	fmt.Printf("标准大端序: %.3f\n", result1)
	
	// 方式2: 字交换小端序
	result2 := parseWordSwappedLittleEndian(testData)
	fmt.Printf("字交换小端序: %.3f\n", result2)
	
	// 方式3: 完全小端序
	result3 := parseLittleEndian(testData)
	fmt.Printf("完全小端序: %.3f\n", result3)
	
	// 方式4: 字交换大端序
	result4 := parseWordSwappedBigEndian(testData)
	fmt.Printf("字交换大端序: %.3f\n", result4)
}

func parseStandardBigEndian(data []byte) float32 {
	bits := binary.BigEndian.Uint32(data)
	return math.Float32frombits(bits)
}

func parseWordSwappedLittleEndian(data []byte) float32 {
	bytes := make([]byte, 4)
	bytes[0] = data[1]
	bytes[1] = data[0]
	bytes[2] = data[3]
	bytes[3] = data[2]
	bits := binary.LittleEndian.Uint32(bytes)
	return math.Float32frombits(bits)
}

func parseLittleEndian(data []byte) float32 {
	bits := binary.LittleEndian.Uint32(data)
	return math.Float32frombits(bits)
}

func parseWordSwappedBigEndian(data []byte) float32 {
	bytes := make([]byte, 4)
	bytes[0] = data[1]
	bytes[1] = data[0]
	bytes[2] = data[3]
	bytes[3] = data[2]
	bits := binary.BigEndian.Uint32(bytes)
	return math.Float32frombits(bits)
}
```

## 4. 最终修复版测试程序

```go
// test_fixed.go - 解决串口缓冲区问题的最终版本
package main

import (
	"encoding/binary"
	"fmt"
	"log"
	"math"
	"time"

	"go.bug.st/serial"
)

func main() {
	fmt.Println("=== DDSU666 修复版测试程序 ===")
	
	// 获取串口和从站地址输入
	ports, err := serial.GetPortsList()
	if err != nil {
		log.Fatal("获取串口列表失败:", err)
	}
	
	fmt.Println("可用串口:", ports)
	
	// 选择串口逻辑...
	
	// 测试所有寄存器
	registers := []struct {
		name string
		addr uint16
	}{
		{"电压", 0x2000},
		{"电流", 0x2002},
		{"有功功率", 0x2004},
		{"无功功率", 0x2006},
		{"视在功率", 0x2008},
		{"功率因数", 0x200A},
		{"频率", 0x200E},
		{"有功总电能", 0x4000},
	}
	
	for _, reg := range registers {
		fmt.Printf("\n--- 测试%s (0x%04X) ---\n", reg.name, reg.addr)
		testRegisterFixed(port, slaveID, reg.addr, reg.name)
		time.Sleep(2000 * time.Millisecond) // 关键：2秒间隔
	}
}

func testRegisterFixed(port serial.Port, slaveID byte, addr uint16, name string) {
	// 1. 清空接收缓冲区 - 关键步骤
	clearBuffer(port)
	
	// 2. 构造并发送请求
	frame := buildReadFrame(slaveID, addr, 2)
	fmt.Printf("发送: % X\n", frame)
	
	n, err := port.Write(frame)
	if err != nil {
		fmt.Printf("发送失败: %v\n", err)
		return
	}
	fmt.Printf("实际发送: %d 字节\n", n)
	
	// 3. 等待设备处理 - 关键步骤
	time.Sleep(200 * time.Millisecond)
	
	// 4. 读取完整响应 - 关键步骤
	response := readCompleteResponse(port, 9)
	if len(response) == 0 {
		fmt.Printf("读取失败: 无响应\n")
		return
	}
	
	fmt.Printf("接收: % X (%d字节)\n", response, len(response))
	
	// 5. 验证和解析响应
	if len(response) >= 9 && response[0] == slaveID && response[1] == 0x03 && response[2] == 4 {
		// 验证CRC
		expectedCRC := calculateCRC16(response[:7])
		actualCRC := binary.LittleEndian.Uint16(response[7:9])
		
		if expectedCRC == actualCRC {
			data := response[3:7]
			fmt.Printf("原始数据: % X\n", data)
			
			// 使用标准大端序解析
			voltage := parseStandardBigEndian(data)
			fmt.Printf("解析结果: %.6f\n", voltage)
		} else {
			fmt.Printf("CRC校验失败\n")
		}
	}
}

// 清空接收缓冲区 - 防止读取到旧数据
func clearBuffer(port serial.Port) {
	port.SetReadTimeout(10 * time.Millisecond)
	buffer := make([]byte, 256)
	// 最多清空5次，避免无限循环
	for i := 0; i < 5; i++ {
		_, err := port.Read(buffer)
		if err != nil {
			break // 没有更多数据
		}
	}
}

// 读取完整响应 - 确保获得完整的9字节响应
func readCompleteResponse(port serial.Port, expectedLen int) []byte {
	port.SetReadTimeout(1000 * time.Millisecond)
	buffer := make([]byte, 256)
	totalBytes := 0
	
	// 最多尝试10次读取
	for i := 0; i < 10; i++ {
		n, err := port.Read(buffer[totalBytes:])
		if err != nil {
			if totalBytes > 0 {
				break // 已有数据，超时结束
			}
			return nil // 完全无响应
		}
		
		totalBytes += n
		if totalBytes >= expectedLen {
			break // 读取到期望长度
		}
		
		time.Sleep(50 * time.Millisecond) // 等待更多数据
	}
	
	return buffer[:totalBytes]
}

func buildReadFrame(slaveID byte, startAddr uint16, quantity uint16) []byte {
	frame := make([]byte, 8)
	frame[0] = slaveID
	frame[1] = 0x03 // 读保持寄存器
	binary.BigEndian.PutUint16(frame[2:4], startAddr)
	binary.BigEndian.PutUint16(frame[4:6], quantity)
	
	crc := calculateCRC16(frame[:6])
	binary.LittleEndian.PutUint16(frame[6:8], crc)
	
	return frame
}

func calculateCRC16(data []byte) uint16 {
	crc := uint16(0xFFFF)
	
	for _, b := range data {
		crc ^= uint16(b)
		for i := 0; i < 8; i++ {
			if crc&0x0001 != 0 {
				crc = (crc >> 1) ^ 0xA001
			} else {
				crc >>= 1
			}
		}
	}
	
	return crc
}

func parseStandardBigEndian(data []byte) float32 {
	bits := binary.BigEndian.Uint32(data)
	return math.Float32frombits(bits)
}
```

## 测试结果总结

### 成功的测试结果
```
--- 测试电压 (0x2000) ---
发送: 18 03 20 00 00 02 CD C2
接收: 18 03 04 43 5E 80 00 67 64 (9字节)
原始数据: 43 5E 80 00
解析结果: 222.500000

--- 测试功率因数 (0x200A) ---
发送: 18 03 20 0A 00 02 ED C0
接收: 18 03 04 3F 80 00 00 7F 0E (9字节)
原始数据: 3F 80 00 00
解析结果: 1.000000

--- 测试频率 (0x200E) ---
发送: 18 03 20 0E 00 02 AC 01
接收: 18 03 04 42 47 E1 48 9E F9 (9字节)
原始数据: 42 47 E1 48
解析结果: 49.970001

--- 测试有功总电能 (0x4000) ---
发送: 18 03 40 00 00 02 D3 C2
接收: 18 03 04 40 0D 70 A4 D2 8A (9字节)
原始数据: 40 0D 70 A4
解析结果: 2.210000
```

## 关键发现

1. **正确的字节序**: DDSU666使用IEEE754标准大端序格式
2. **串口缓冲区问题**: 必须在每次读取前清空缓冲区
3. **完整响应读取**: 需要循环读取确保获得完整的9字节响应
4. **设备处理时间**: 发送后需等待200ms让设备处理
5. **请求间隔**: 连续请求间隔需要2秒以上

## 应用到主程序

这些测试程序的关键逻辑已经应用到主程序的 `poller.go` 中：
- `clearBuffer()` 函数
- `readCompleteResponse()` 函数  
- 标准大端序解析
- 适当的等待时间

这确保了主程序能够正确读取DDSU666设备的实时数据。