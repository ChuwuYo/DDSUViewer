package service

import (
	"sync"
	"time"

	"DDSUViewer/internal/poller"
	"DDSUViewer/internal/registers"
	"DDSUViewer/internal/serial"
	goserial "go.bug.st/serial"
)

// Service 服务管理器
type Service struct {
	conn         *serial.Connection
	poller       *poller.Poller
	config       *SerialConfig
	status       *DeviceStatus
	lastData     *registers.ElectricalData
	mutex        sync.RWMutex
	subscribers  map[string]chan *registers.ElectricalData
	statusSubs   map[string]chan *DeviceStatus
}

// SerialConfig 串口配置
type SerialConfig struct {
	Port     string
	BaudRate int
	DataBits int
	StopBits int
	Parity   string
	SlaveID  int
}

// DeviceStatus 设备状态
type DeviceStatus struct {
	Connected    bool
	Protocol     string
	LastUpdate   time.Time
	ErrorMessage string
}

// NewService 创建服务实例
func NewService() *Service {
	return &Service{
		config: &SerialConfig{
			Port:     "COM1",
			BaudRate: 9600,
			DataBits: 8,
			StopBits: 1,
			Parity:   "None",
			SlaveID:  12,
		},
		status: &DeviceStatus{
			Connected:  false,
			Protocol:   "Modbus RTU",
			LastUpdate: time.Now(),
		},
		subscribers: make(map[string]chan *registers.ElectricalData),
		statusSubs:  make(map[string]chan *DeviceStatus),
	}
}

// GetElectricalData 获取最新电参量数据
func (s *Service) GetElectricalData() *registers.ElectricalData {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.lastData
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

	// 创建串口连接
	serialConfig := serial.Config{
		Port:     s.config.Port,
		BaudRate: s.config.BaudRate,
		DataBits: s.config.DataBits,
		StopBits: goserial.StopBits(s.config.StopBits),
		Parity:   s.parseParity(s.config.Parity),
	}

	s.conn = serial.NewConnection(serialConfig)
	if err := s.conn.Open(); err != nil {
		s.status.Connected = false
		s.status.ErrorMessage = err.Error()
		return err
	}

	// 创建轮询器
	s.poller = poller.NewPoller(s.conn, byte(s.config.SlaveID))
	if err := s.poller.Start(); err != nil {
		s.conn.Close()
		return err
	}

	s.status.Connected = true
	s.status.ErrorMessage = ""

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
	}
	if s.conn != nil {
		s.conn.Close()
	}

	s.status.Connected = false
	return nil
}

// GetAvailablePorts 获取可用串口列表
func (s *Service) GetAvailablePorts() ([]string, error) {
	return serial.GetAvailablePorts()
}

// Subscribe 订阅数据更新
func (s *Service) Subscribe(id string) <-chan *registers.ElectricalData {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	ch := make(chan *registers.ElectricalData, 10)
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
	for data := range dataChan {
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

// parseParity 解析校验位
func (s *Service) parseParity(parity string) goserial.Parity {
	switch parity {
	case "Even":
		return goserial.EvenParity
	case "Odd":
		return goserial.OddParity
	default:
		return goserial.NoParity
	}
}