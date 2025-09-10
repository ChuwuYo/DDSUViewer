package poller

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"DDSUViewer/internal/modbus"
	"DDSUViewer/internal/parser"
	"DDSUViewer/internal/registers"
	"DDSUViewer/internal/serial"
)

// Poller 轮询器
type Poller struct {
	conn       *serial.Connection
	slaveID    byte
	running    bool
	mutex      sync.RWMutex
	ctx        context.Context
	cancel     context.CancelFunc
	dataChan   chan *registers.ElectricalData
	lastData   *registers.ElectricalData
	dataMutex  sync.RWMutex
	commMutex  sync.Mutex // 串口通信互斥锁
	parser     *parser.DataParser
}

// NewPoller 创建轮询器
func NewPoller(conn *serial.Connection, slaveID byte) *Poller {
	return &Poller{
		conn:     conn,
		slaveID:  slaveID,
		dataChan: make(chan *registers.ElectricalData, 10),
		parser:   parser.NewDataParser(),
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

	// 启动时立即进行完整的初始化读取
	go p.initialDataRead()
	// 启动统一的数据轮询
	go p.pollAllData()

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

// initialDataRead 启动时的初始化数据读取
func (p *Poller) initialDataRead() {
	log.Printf("开始初始化数据读取...")
	
	// 立即读取所有数据（电参量+电能）
	data := p.readAllRegisters()
	if data != nil {
		// 应用数据过滤
		filteredData := p.parser.FilterElectricalData(data)
		if filteredData != nil {
			log.Printf("初始化数据读取成功: 电压=%.1fV, 电能=%.3fkWh", filteredData.Voltage, filteredData.ActiveEnergy)
			select {
			case p.dataChan <- filteredData:
			default:
				// 如果通道满，直接覆盖lastData
				p.dataMutex.Lock()
				p.lastData = filteredData
				p.dataMutex.Unlock()
			}
		}
	} else {
		log.Printf("初始化数据读取失败")
	}
}

// pollAllData 统一的数据轮询 (1秒周期读电参量，每10次读电能)
func (p *Poller) pollAllData() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	counter := 0

	for {
		select {
		case <-p.ctx.Done():
			return
		case <-ticker.C:
			counter++
			
			var data *registers.ElectricalData
			
			// 每10秒读取完整数据（电参量+电能）
			if counter%10 == 0 {
				data = p.readAllRegisters()
				// 每10秒输出一次详细日志
				if data != nil {
					log.Printf("第%d秒数据: 电压=%.1fV, 电流=%.3fA, 功率=%.1fW, 频率=%.1fHz, 电能=%.3fkWh",
						counter, data.Voltage, data.Current, data.ActivePower, data.Frequency, data.ActiveEnergy)
				}
			} else {
				// 其他时候只读电参量，保留电能值（静默模式）
				data = p.readElectricalRegistersOnly()
			}
			
			if data != nil {
				// 应用数据过滤
				filteredData := p.parser.FilterElectricalData(data)
				if filteredData != nil {
					// 验证数据完整性
					if p.validateDataIntegrity(filteredData) {
						select {
						case p.dataChan <- filteredData:
						default:
							// 通道满时丢弃旧数据
						}
					}
				}
			}
		}
	}
}

// validateDataIntegrity 验证数据完整性，适配小数值场景
func (p *Poller) validateDataIntegrity(data *registers.ElectricalData) bool {
	if data == nil {
		log.Printf("数据验证失败: 数据为空")
		return false
	}
	
	// 实际的数据完整性验证：至少要有一个有效的主要参数
	hasValidVoltage := data.Voltage > 0
	hasValidCurrent := data.Current > 0
	hasValidPower := data.ActivePower > 0
	hasValidFrequency := data.Frequency > 0
	hasValidEnergy := data.ActiveEnergy >= 0 // 电能可以为0
	
	// 至少需要电压或频率其中一个有效，表示设备通信正常
	isValid := hasValidVoltage || hasValidFrequency
	
	// 如果有电流或功率，也认为是有效数据
	if hasValidCurrent || hasValidPower {
		isValid = true
	}
	
	// 如果只有电能数据也认为是有效的（可能是待机状态）
	if hasValidEnergy && data.ActiveEnergy > 0 {
		isValid = true
	}
	
	return isValid
}

// readAllRegisters 读取所有寄存器（电参量+电能）
func (p *Poller) readAllRegisters() *registers.ElectricalData {
	regData := make(map[uint16][]byte)

	// 1. 读取电参量寄存器 (0x2000-0x200F)
	electricalData := p.readRegistersWithRetry(registers.RegVoltage, 16)
	if electricalData != nil && len(electricalData) >= 32 {
		regData[registers.RegVoltage] = electricalData[0:4]        // 0x2000
		regData[registers.RegCurrent] = electricalData[4:8]        // 0x2002
		regData[registers.RegActivePower] = electricalData[8:12]   // 0x2004
		regData[registers.RegReactivePower] = electricalData[12:16] // 0x2006
		regData[registers.RegApparentPower] = electricalData[16:20] // 0x2008
		regData[registers.RegPowerFactor] = electricalData[20:24]   // 0x200A
		// 跳过 0x200C (electricalData[24:28]) - 保留地址
		regData[registers.RegFrequency] = electricalData[28:32]     // 0x200E
	} else {
		log.Printf("读取电参量寄存器失败")
	}

	// 2. 读取电能寄存器 (0x4000)
	energyData := p.readRegistersWithRetry(registers.RegActiveEnergy, 2)
	if energyData != nil && len(energyData) >= 4 {
		regData[registers.RegActiveEnergy] = energyData
	} else {
		log.Printf("读取电能寄存器失败")
	}

	// 3. 解析数据
	parsedData := registers.ParseElectricalData(regData)
	
	// 4. 更新lastData
	p.dataMutex.Lock()
	if parsedData != nil {
		p.lastData = p.copyElectricalData(parsedData)
		dataToSend := p.copyElectricalData(parsedData)
		p.dataMutex.Unlock()
		return dataToSend
	}
	p.dataMutex.Unlock()
	
	return nil
}

// readElectricalRegistersOnly 只读取电参量寄存器，保留电能值
func (p *Poller) readElectricalRegistersOnly() *registers.ElectricalData {
	regData := make(map[uint16][]byte)

	// 读取电参量寄存器 (0x2000-0x200F)
	data := p.readRegistersWithRetry(registers.RegVoltage, 16)
	if data != nil && len(data) >= 32 {
		regData[registers.RegVoltage] = data[0:4]        // 0x2000
		regData[registers.RegCurrent] = data[4:8]        // 0x2002
		regData[registers.RegActivePower] = data[8:12]   // 0x2004
		regData[registers.RegReactivePower] = data[12:16] // 0x2006
		regData[registers.RegApparentPower] = data[16:20] // 0x2008
		regData[registers.RegPowerFactor] = data[20:24]   // 0x200A
		// 跳过 0x200C (data[24:28]) - 保留地址
		regData[registers.RegFrequency] = data[28:32]     // 0x200E
	} else {
		// 如果电参量读取失败，但有之前的数据，返回之前的数据副本
		p.dataMutex.RLock()
		if p.lastData != nil {
			dataToSend := p.copyElectricalData(p.lastData)
			p.dataMutex.RUnlock()
			return dataToSend
		}
		p.dataMutex.RUnlock()
		return nil
	}

	parsedData := registers.ParseElectricalData(regData)
	
	p.dataMutex.Lock()
	if parsedData != nil {
		// 保留之前的电能值
		if p.lastData != nil {
			parsedData.ActiveEnergy = p.lastData.ActiveEnergy
		}
		p.lastData = p.copyElectricalData(parsedData)
		dataToSend := p.copyElectricalData(parsedData)
		p.dataMutex.Unlock()
		return dataToSend
	}
	p.dataMutex.Unlock()
	
	return nil
}

// copyElectricalData 创建ElectricalData的副本
func (p *Poller) copyElectricalData(src *registers.ElectricalData) *registers.ElectricalData {
	return &registers.ElectricalData{
		Voltage:       src.Voltage,
		Current:       src.Current,
		ActivePower:   src.ActivePower,
		ReactivePower: src.ReactivePower,
		ApparentPower: src.ApparentPower,
		PowerFactor:   src.PowerFactor,
		Frequency:     src.Frequency,
		ActiveEnergy:  src.ActiveEnergy,
	}
}

// readRegistersWithRetry 带重试的寄存器读取
func (p *Poller) readRegistersWithRetry(startAddr uint16, quantity uint16) []byte {
	maxRetries := 3
	timeout := 500 * time.Millisecond

	for retry := 0; retry < maxRetries; retry++ {
		data, err := p.readRegisters(startAddr, quantity, timeout)
		if err == nil && data != nil {
			// 验证数据长度
			expectedLen := int(quantity) * 2
			if len(data) >= expectedLen {
				return data
			}
			// 数据长度不符合，视为失败
		}

		// 记录重试信息（可选）
		if retry < maxRetries-1 {
			// 增加重试间隔，避免过快重试
			time.Sleep(time.Duration(retry+1) * 100 * time.Millisecond)
		}
	}

	return nil
}

// readRegisters 读取寄存器（添加串口互斥保护）
func (p *Poller) readRegisters(startAddr uint16, quantity uint16, timeout time.Duration) ([]byte, error) {
	// 串口访问互斥保护
	p.commMutex.Lock()
	defer p.commMutex.Unlock()
	
	if !p.conn.IsOpen() {
		return nil, fmt.Errorf("串口未打开")
	}

	// 1. 清空接收缓冲区
	p.clearBuffer()

	// 2. 构造读取帧
	frame := modbus.BuildReadFrame(p.slaveID, startAddr, quantity)

	// 3. 发送请求
	_, err := p.conn.Write(frame)
	if err != nil {
		return nil, fmt.Errorf("发送失败: %v", err)
	}

	// 4. 等待设备处理
	time.Sleep(200 * time.Millisecond)

	// 5. 计算期望的响应长度
	expectedLen := 3 + int(quantity)*2 + 2 // 从站ID(1) + 功能码(1) + 字节数(1) + 数据(quantity*2) + CRC(2)
	
	// 6. 读取完整响应
	response := p.readCompleteResponse(expectedLen)
	if len(response) == 0 {
		return nil, fmt.Errorf("无响应")
	}

	// 7. 解析响应
	parsedResponse, err := modbus.ParseResponse(response)
	if err != nil {
		return nil, fmt.Errorf("解析失败: %v", err)
	}

	return parsedResponse.Data, nil
}

// clearBuffer 清空接收缓冲区
func (p *Poller) clearBuffer() {
	buffer := make([]byte, 256)
	// 最多清理5次，避免无限循环
	for i := 0; i < 5; i++ {
		_, err := p.conn.ReadWithTimeout(buffer, 10*time.Millisecond)
		if err != nil {
			break // 没有更多数据
		}
	}
}

// readCompleteResponse 读取完整响应
func (p *Poller) readCompleteResponse(expectedLen int) []byte {
	buffer := make([]byte, 256)
	totalBytes := 0
	maxAttempts := 10
	readTimeout := 500 * time.Millisecond
	
	// 分段读取，确保获取完整响应
	for attempt := 0; attempt < maxAttempts; attempt++ {
		n, err := p.conn.ReadWithTimeout(buffer[totalBytes:], readTimeout)
		if err != nil {
			if totalBytes > 0 {
				break // 已有部分数据，结束读取
			}
			return nil // 完全无响应
		}
		
		totalBytes += n
		
		// 检查是否已获取足够数据
		if totalBytes >= expectedLen {
			break
		}
		
		// 如果数据还不够，减少等待时间继续读取
		if totalBytes > 0 {
			time.Sleep(50 * time.Millisecond)
		}
	}
	
	// 验证最小响应长度
	if totalBytes < 5 {
		return nil // 响应太短，无效
	}
	
	return buffer[:totalBytes]
}