// internal/modbus/modbus.go: Modbus 协议实现。
// 说明：负责构建 Modbus RTU 请求帧（含 CRC16）、解析设备响应、处理异常码与寄存器读写语义，供 poller/serial 层调用。
// 目的：Modbus RTU 帧结构与校验要点，修改此文件时请谨慎保持字节序、超时与重传策略一致以免影响通信稳定性。
package modbus

import (
	"encoding/binary"
	"fmt"
)

// 功能码
const (
	FunctionReadHoldingRegisters = 0x03
)

// Frame Modbus RTU 帧
type Frame struct {
	SlaveID  byte
	Function byte
	Data     []byte
	CRC      uint16
}

// BuildReadFrame 构造读寄存器帧
func BuildReadFrame(slaveID byte, startAddr uint16, quantity uint16) []byte {
	frame := make([]byte, 8)
	frame[0] = slaveID
	frame[1] = FunctionReadHoldingRegisters
	binary.BigEndian.PutUint16(frame[2:4], startAddr)
	binary.BigEndian.PutUint16(frame[4:6], quantity)
	
	crc := CalculateCRC16(frame[:6])
	binary.LittleEndian.PutUint16(frame[6:8], crc)
	
	return frame
}

// ParseResponse 解析响应帧
func ParseResponse(data []byte) (*Frame, error) {
	if len(data) < 5 {
		return nil, fmt.Errorf("响应帧长度不足")
	}

	frame := &Frame{
		SlaveID:  data[0],
		Function: data[1],
	}

	// 检查是否为异常响应
	if frame.Function&0x80 != 0 {
		if len(data) < 5 {
			return nil, fmt.Errorf("异常响应帧长度不足")
		}
		frame.Data = data[2:3] // 异常码
		frame.CRC = binary.LittleEndian.Uint16(data[3:5])
		return frame, fmt.Errorf("Modbus异常响应: %02X", data[2])
	}

	// 正常响应
	byteCount := data[2]
	if len(data) < int(3+byteCount+2) {
		return nil, fmt.Errorf("响应帧数据长度不足")
	}

	frame.Data = data[3 : 3+byteCount]
	frame.CRC = binary.LittleEndian.Uint16(data[3+byteCount : 3+byteCount+2])

	// 验证CRC
	expectedCRC := CalculateCRC16(data[:3+byteCount])
	if frame.CRC != expectedCRC {
		return nil, fmt.Errorf("CRC校验失败")
	}

	return frame, nil
}

// CalculateCRC16 计算CRC16校验码
func CalculateCRC16(data []byte) uint16 {
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