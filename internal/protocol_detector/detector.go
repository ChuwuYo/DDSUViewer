package protocol_detector

import (
	"fmt"
	"time"

	"DDSUViewer/internal/modbus"
	"DDSUViewer/internal/serial"
)

// Detector 协议探测器
type Detector struct {
	conn *serial.Connection
}

// NewDetector 创建协议探测器
func NewDetector(conn *serial.Connection) *Detector {
	return &Detector{conn: conn}
}

// TestModbusConnection 测试Modbus连接
func (d *Detector) TestModbusConnection(slaveID byte) error {
	if !d.conn.IsOpen() {
		return fmt.Errorf("串口未打开")
	}

	// 构造测试帧：按文档示例 0C 03 20 00 00 02
	testFrame := modbus.BuildReadFrame(slaveID, 0x2000, 2)
	
	// 发送测试帧
	_, err := d.conn.Write(testFrame)
	if err != nil {
		return fmt.Errorf("发送测试帧失败: %v", err)
	}

	// 读取响应
	buffer := make([]byte, 256)
	n, err := d.conn.ReadWithTimeout(buffer, 200*time.Millisecond)
	if err != nil {
		return fmt.Errorf("读取响应超时: %v", err)
	}

	if n == 0 {
		return fmt.Errorf("未收到响应")
	}

	// 解析响应
	_, err = modbus.ParseResponse(buffer[:n])
	if err != nil {
		return fmt.Errorf("响应解析失败: %v", err)
	}

	return nil
}

// DetectProtocol 探测协议类型
func (d *Detector) DetectProtocol(slaveID byte) (string, error) {
	// 测试Modbus RTU
	err := d.TestModbusConnection(slaveID)
	if err == nil {
		return "Modbus RTU", nil
	}

	return "Unknown", fmt.Errorf("未检测到支持的协议: %v", err)
}