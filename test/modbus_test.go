package test

import (
	"testing"

	"DDSUViewer/internal/modbus"
)

func TestCRC16Calculation(t *testing.T) {
	// 测试CRC16计算
	testData := []byte{0x0C, 0x03, 0x20, 0x00, 0x00, 0x02}
	
	crc := modbus.CalculateCRC16(testData)
	// 验证CRC计算是否一致
	if crc == 0 {
		t.Errorf("CRC16计算结果为0，可能有错误")
	}
	t.Logf("CRC16计算结果: %04X", crc)
}

func TestBuildReadFrame(t *testing.T) {
	// 测试构造读取帧
	frame := modbus.BuildReadFrame(0x0C, 0x2000, 0x0002)
	
	if len(frame) != 8 {
		t.Errorf("帧长度错误: 期望 8, 得到 %d", len(frame))
	}

	if frame[0] != 0x0C {
		t.Errorf("从站地址错误: 期望 0x0C, 得到 0x%02X", frame[0])
	}

	if frame[1] != 0x03 {
		t.Errorf("功能码错误: 期望 0x03, 得到 0x%02X", frame[1])
	}
}

func TestParseResponse(t *testing.T) {
	// 构造一个有效的响应帧
	responseHeader := []byte{0x0C, 0x03, 0x04, 0x41, 0x20, 0x00, 0x00}
	crc := modbus.CalculateCRC16(responseHeader)
	responseData := append(responseHeader, byte(crc&0xFF), byte(crc>>8))
	
	frame, err := modbus.ParseResponse(responseData)
	if err != nil {
		t.Errorf("解析响应失败: %v", err)
		return
	}

	if frame.SlaveID != 0x0C {
		t.Errorf("从站地址错误: 期望 0x0C, 得到 0x%02X", frame.SlaveID)
	}

	if frame.Function != 0x03 {
		t.Errorf("功能码错误: 期望 0x03, 得到 0x%02X", frame.Function)
	}

	if len(frame.Data) != 4 {
		t.Errorf("数据长度错误: 期望 4, 得到 %d", len(frame.Data))
	}
}