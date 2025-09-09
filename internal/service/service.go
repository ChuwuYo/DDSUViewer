package service

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"DDSUViewer/internal/poller"
	"DDSUViewer/internal/serial"
	goserial "go.bug.st/serial"
)

// Service 服务管理器
type Service struct {
	conn         *serial.Connection
	poller       *poller.Poller
	config       *SerialConfig
	status       *DeviceStatus
	lastData     *ElectricalData
	mutex        sync.RWMutex
	subscribers  map[string]chan *ElectricalData
	statusSubs   map[string]chan *DeviceStatus
}

// SerialConfig 串口配置
type SerialConfig struct {
	Port     string
	BaudRate int
	DataBits int
	StopBits goserial.StopBits
	Parity   goserial.Parity
	SlaveID  int
}

// DeviceStatus 设备状态
type DeviceStatus struct {
	Connected    bool
	Protocol     string
	LastUpdate   time.Time
	ErrorMessage string
}

// ElectricalData 电参量数据
type ElectricalData struct {
	Voltage       float64
	Current       float64
	ActivePower   float64
	ReactivePower float64
	ApparentPower float64
	PowerFactor   float64
	Frequency     float64
	ActiveEnergy  float64
	Timestamp     time.Time
}

// NewService 创建服务实例
func NewService() *Service {
	return &Service{
		config: &SerialConfig{
			Port:     "COM1",
			BaudRate: 9600,
			DataBits: 8,
			StopBits: goserial.OneStopBit,
			Parity:   goserial.NoParity,
			SlaveID:  12,
		},
		status: &DeviceStatus{
			Connected:  false,
			Protocol:   "Modbus RTU",
			LastUpdate: time.Now(),
		},
		subscribers: make(map[string]chan *ElectricalData),
		statusSubs:  make(map[string]chan *DeviceStatus),
	}
}

// GetElectricalData 获取最新电参量数据
func (s *Service) GetElectricalData() *ElectricalData {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.lastData // 如果没有数据就返回 nil
}

// GetDeviceStatus 获取设备状态
func (s *Service) GetDeviceStatus() *DeviceStatus {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.status
}

// GetSerialConfig 获取串口配置
func (s *Service) GetSerialConfig() *SerialConfig {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.config
}

// UpdateSerialConfig 更新串口配置
func (s *Service) UpdateSerialConfig(config *SerialConfig) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// 如果正在运行，先停止
	if s.poller != nil && s.poller.IsRunning() {
		s.poller.Stop()
	}
	if s.conn != nil && s.conn.IsOpen() {
		s.conn.Close()
	}

	s.config = config
	return nil
}

// StartPolling 启动数据采集
func (s *Service) StartPolling() error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if s.poller != nil && s.poller.IsRunning() {
		return nil // 已在运行
	}

	// 检查串口配置
	if s.config.Port == "" {
		err := fmt.Errorf("请选择串口")
		s.status.Connected = false
		s.status.ErrorMessage = err.Error()
		return err
	}

	// 创建串口连接
	serialConfig := serial.Config{
		Port:     s.config.Port,
		BaudRate: s.config.BaudRate,
		DataBits: s.config.DataBits,
		StopBits: s.config.StopBits,
		Parity:   s.config.Parity,
	}

	s.conn = serial.NewConnection(serialConfig)
	if err := s.conn.Open(); err != nil {
		s.status.Connected = false
		// 提供更详细的错误信息
		if strings.Contains(err.Error(), "not found") {
			s.status.ErrorMessage = fmt.Sprintf("串口 %s 不存在，请检查设备连接", s.config.Port)
		} else if strings.Contains(err.Error(), "Access is denied") || strings.Contains(err.Error(), "busy") {
			s.status.ErrorMessage = fmt.Sprintf("串口 %s 被占用，请关闭其他程序后重试", s.config.Port)
		} else {
			s.status.ErrorMessage = fmt.Sprintf("打开串口失败: %v", err)
		}
		return fmt.Errorf(s.status.ErrorMessage)
	}

	// 创建轮询器
	s.poller = poller.NewPoller(s.conn, byte(s.config.SlaveID))
	if err := s.poller.Start(); err != nil {
		s.conn.Close()
		return err
	}

	s.status.Connected = true
	s.status.ErrorMessage = ""
	
	// 通知状态订阅者
	for _, ch := range s.statusSubs {
		select {
		case ch <- s.status:
		default:
			// 通道满时跳过
		}
	}

	// 启动数据监听
	go s.listenData()

	return nil
}

// StopPolling 停止数据采集
func (s *Service) StopPolling() error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if s.poller != nil {
		s.poller.Stop()
		s.poller = nil
	}
	if s.conn != nil {
		s.conn.Close()
		s.conn = nil
	}

	s.status.Connected = false
	s.status.ErrorMessage = ""
	
	// 通知状态订阅者
	for _, ch := range s.statusSubs {
		select {
		case ch <- s.status:
		default:
			// 通道满时跳过
		}
	}
	
	return nil
}

// GetAvailablePorts 获取可用串口列表
func (s *Service) GetAvailablePorts() ([]string, error) {
	return serial.GetAvailablePorts()
}

// Subscribe 订阅数据更新
func (s *Service) Subscribe(id string) <-chan *ElectricalData {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	ch := make(chan *ElectricalData, 10)
	s.subscribers[id] = ch
	return ch
}

// SubscribeStatus 订阅状态更新
func (s *Service) SubscribeStatus(id string) <-chan *DeviceStatus {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	ch := make(chan *DeviceStatus, 10)
	s.statusSubs[id] = ch
	return ch
}

// Unsubscribe 取消订阅
func (s *Service) Unsubscribe(id string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if ch, ok := s.subscribers[id]; ok {
		close(ch)
		delete(s.subscribers, id)
	}
	if ch, ok := s.statusSubs[id]; ok {
		close(ch)
		delete(s.statusSubs, id)
	}
}

// listenData 监听数据更新
func (s *Service) listenData() {
	dataChan := s.poller.GetDataChannel()
	for regData := range dataChan {
		// 转换数据类型
		data := &ElectricalData{
			Voltage:       float64(regData.Voltage),
			Current:       float64(regData.Current),
			ActivePower:   float64(regData.ActivePower),
			ReactivePower: float64(regData.ReactivePower),
			ApparentPower: float64(regData.ApparentPower),
			PowerFactor:   float64(regData.PowerFactor),
			Frequency:     float64(regData.Frequency),
			ActiveEnergy:  float64(regData.ActiveEnergy),
			Timestamp:     time.Now(),
		}

		s.mutex.Lock()
		s.lastData = data
		s.status.LastUpdate = time.Now()
		s.mutex.Unlock()

		// 广播给订阅者
		s.mutex.RLock()
		for _, ch := range s.subscribers {
			select {
			case ch <- data:
			default:
				// 通道满时跳过
			}
		}
		s.mutex.RUnlock()
	}
}

