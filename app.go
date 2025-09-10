package main

import (
	"context"
	"log"

	"DDSUViewer/internal/service"
	goserial "go.bug.st/serial"
)

// App struct
type App struct {
	ctx     context.Context
	service *service.Service
}

// NewApp creates a new App application struct
func NewApp() *App {
	svc := service.NewService()

	return &App{
		service: svc,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	log.Printf("DDSUViewer 应用启动成功")
}

// GetAvailablePorts 获取可用串口列表 (Wails方法)
func (a *App) GetAvailablePorts() []string {
	ports, err := a.service.GetAvailablePorts()
	if err != nil {
		log.Printf("获取串口列表失败: %v", err)
		return []string{}
	}
	return ports
}

// GetElectricalData 获取电参量数据 (Wails方法)
func (a *App) GetElectricalData() map[string]interface{} {
	data := a.service.GetElectricalData()
	if data == nil {
		log.Printf("Wails.GetElectricalData: 返回nil (无数据)")
		return nil
	}
	
	result := map[string]interface{}{
		"voltage":       data.Voltage,
		"current":       data.Current,
		"activePower":   data.ActivePower,
		"reactivePower": data.ReactivePower,
		"apparentPower": data.ApparentPower,
		"powerFactor":   data.PowerFactor,
		"frequency":     data.Frequency,
		"activeEnergy":  data.ActiveEnergy,
		"timestamp":     data.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
	}
	
	log.Printf("Wails.GetElectricalData: 返回数据 电压=%.3f, 电流=%.6f, 功率=%.3f, 频率=%.3f, 电能=%.3f",
		data.Voltage, data.Current, data.ActivePower, data.Frequency, data.ActiveEnergy)
	
	return result
}

// StartPolling 启动数据采集 (Wails方法)
func (a *App) StartPolling() bool {
	err := a.service.StartPolling()
	if err != nil {
		log.Printf("启动数据采集失败: %v", err)
		return false
	}
	return true
}

// StopPolling 停止数据采集 (Wails方法)
func (a *App) StopPolling() bool {
	err := a.service.StopPolling()
	if err != nil {
		log.Printf("停止数据采集失败: %v", err)
		return false
	}
	return true
}

// UpdateSerialConfig 更新串口配置 (Wails方法)
func (a *App) UpdateSerialConfig(port string, baudRate int, dataBits int, stopBits int, parity string, slaveID int) bool {
	// 转换停止位
	var sb goserial.StopBits
	if stopBits == 2 {
		sb = goserial.TwoStopBits
	} else {
		sb = goserial.OneStopBit
	}
	
	// 转换校验位
	var p goserial.Parity
	switch parity {
	case "Even":
		p = goserial.EvenParity
	case "Odd":
		p = goserial.OddParity
	default:
		p = goserial.NoParity
	}
	
	config := &service.SerialConfig{
		Port:     port,
		BaudRate: baudRate,
		DataBits: dataBits,
		StopBits: sb,
		Parity:   p,
		SlaveID:  slaveID,
	}
	
	err := a.service.UpdateSerialConfig(config)
	if err != nil {
		log.Printf("更新串口配置失败: %v", err)
		return false
	}
	return true
}
