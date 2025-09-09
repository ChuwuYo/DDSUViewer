package serial

import (
	"fmt"
	"sync"
	"time"

	"go.bug.st/serial"
)

// Config 串口配置
type Config struct {
	Port     string
	BaudRate int
	DataBits int
	StopBits serial.StopBits
	Parity   serial.Parity
}

// Connection 串口连接
type Connection struct {
	port   serial.Port
	config Config
	mutex  sync.Mutex
	isOpen bool
}

// NewConnection 创建新的串口连接
func NewConnection(config Config) *Connection {
	return &Connection{
		config: config,
		isOpen: false,
	}
}

// Open 打开串口
func (c *Connection) Open() error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if c.isOpen {
		return fmt.Errorf("串口已打开")
	}

	mode := &serial.Mode{
		BaudRate: c.config.BaudRate,
		DataBits: c.config.DataBits,
		Parity:   c.config.Parity,
		StopBits: c.config.StopBits,
	}

	port, err := serial.Open(c.config.Port, mode)
	if err != nil {
		return fmt.Errorf("打开串口失败: %v", err)
	}

	c.port = port
	c.isOpen = true
	return nil
}

// Close 关闭串口
func (c *Connection) Close() error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if !c.isOpen {
		return nil
	}

	err := c.port.Close()
	c.isOpen = false
	return err
}

// Write 写入数据
func (c *Connection) Write(data []byte) (int, error) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if !c.isOpen {
		return 0, fmt.Errorf("串口未打开")
	}

	return c.port.Write(data)
}

// Read 读取数据
func (c *Connection) Read(buffer []byte) (int, error) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if !c.isOpen {
		return 0, fmt.Errorf("串口未打开")
	}

	return c.port.Read(buffer)
}

// ReadWithTimeout 带超时的读取
func (c *Connection) ReadWithTimeout(buffer []byte, timeout time.Duration) (int, error) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if !c.isOpen {
		return 0, fmt.Errorf("串口未打开")
	}

	c.port.SetReadTimeout(timeout)
	return c.port.Read(buffer)
}

// IsOpen 检查串口是否打开
func (c *Connection) IsOpen() bool {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	return c.isOpen
}

// GetAvailablePorts 获取可用串口列表
func GetAvailablePorts() ([]string, error) {
	ports, err := serial.GetPortsList()
	if err != nil {
		return nil, fmt.Errorf("获取串口列表失败: %v", err)
	}
	return ports, nil
}