package poller

import (
	"context"
	"fmt"
	"sync"
	"time"

	"DDSUViewer/internal/modbus"
	"DDSUViewer/internal/registers"
	"DDSUViewer/internal/serial"
)

// Poller 轮询器
type Poller struct {
	conn     *serial.Connection
	slaveID  byte
	running  bool
	mutex    sync.RWMutex
	ctx      context.Context
	cancel   context.CancelFunc
	dataChan chan *registers.ElectricalData
}

// NewPoller 创建轮询器
func NewPoller(conn *serial.Connection, slaveID byte) *Poller {
	return &Poller{
		conn:     conn,
		slaveID:  slaveID,
		dataChan: make(chan *registers.ElectricalData, 10),
	}
}

// Start 启动轮询
func (p *Poller) Start() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.running {
		return fmt.Errorf("轮询已在运行")
	}

	p.ctx, p.cancel = context.WithCancel(context.Background())
	p.running = true

	go p.pollElectricalData()
	go p.pollEnergyData()

	return nil
}

// Stop 停止轮询
func (p *Poller) Stop() {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if !p.running {
		return
	}

	p.cancel()
	p.running = false
}

// GetDataChannel 获取数据通道
func (p *Poller) GetDataChannel() <-chan *registers.ElectricalData {
	return p.dataChan
}

// IsRunning 检查是否在运行
func (p *Poller) IsRunning() bool {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.running
}

// pollElectricalData 轮询电参量数据 (1秒周期)
func (p *Poller) pollElectricalData() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-p.ctx.Done():
			return
		case <-ticker.C:
			data := p.readElectricalRegisters()
			if data != nil {
				select {
				case p.dataChan <- data:
				default:
					// 通道满时丢弃旧数据
				}
			}
		}
	}
}

// pollEnergyData 轮询电能数据 (10秒周期)
func (p *Poller) pollEnergyData() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-p.ctx.Done():
			return
		case <-ticker.C:
			p.readEnergyRegister()
		}
	}
}

// readElectricalRegisters 读取电参量寄存器
func (p *Poller) readElectricalRegisters() *registers.ElectricalData {
	regData := make(map[uint16][]byte)

	// 从 0x2000 连读到 0x200F (8个地址×2寄存器=16个寄存器)
	data := p.readRegistersWithRetry(registers.RegVoltage, 16)
	if data != nil && len(data) >= 32 {
		// 解析各个数据点 (每个数据点占4字节)
		regData[registers.RegVoltage] = data[0:4]        // 0x2000
		regData[registers.RegCurrent] = data[4:8]        // 0x2002  
		regData[registers.RegActivePower] = data[8:12]   // 0x2004
		regData[registers.RegReactivePower] = data[12:16] // 0x2006
		regData[registers.RegApparentPower] = data[16:20] // 0x2008
		regData[registers.RegPowerFactor] = data[20:24]   // 0x200A
		// 跳过 0x200C (data[24:28]) - 保留地址
		regData[registers.RegFrequency] = data[28:32]     // 0x200E
	}

	return registers.ParseElectricalData(regData)
}

// readEnergyRegister 读取电能寄存器
func (p *Poller) readEnergyRegister() {
	data := p.readRegistersWithRetry(registers.RegActiveEnergy, 2)
	if data != nil {
		// 处理电能数据
		energy := registers.ParseFloat32(data)
		if registers.IsValidFloat32(energy) {
			// 可以在这里处理电能数据
		}
	}
}

// readRegistersWithRetry 带重试的寄存器读取
func (p *Poller) readRegistersWithRetry(startAddr uint16, quantity uint16) []byte {
	maxRetries := 3
	timeout := 200 * time.Millisecond

	for retry := 0; retry < maxRetries; retry++ {
		data, err := p.readRegisters(startAddr, quantity, timeout)
		if err == nil {
			return data
		}

		// 重试前等待一小段时间
		if retry < maxRetries-1 {
			time.Sleep(50 * time.Millisecond)
		}
	}

	return nil
}

// readRegisters 读取寄存器
func (p *Poller) readRegisters(startAddr uint16, quantity uint16, timeout time.Duration) ([]byte, error) {
	if !p.conn.IsOpen() {
		return nil, fmt.Errorf("串口未打开")
	}

	// 构造读取帧
	frame := modbus.BuildReadFrame(p.slaveID, startAddr, quantity)

	// 发送请求
	_, err := p.conn.Write(frame)
	if err != nil {
		return nil, fmt.Errorf("发送失败: %v", err)
	}

	// 读取响应
	buffer := make([]byte, 256)
	n, err := p.conn.ReadWithTimeout(buffer, timeout)
	if err != nil {
		return nil, fmt.Errorf("读取超时: %v", err)
	}

	// 解析响应
	response, err := modbus.ParseResponse(buffer[:n])
	if err != nil {
		return nil, fmt.Errorf("解析失败: %v", err)
	}

	return response.Data, nil
}