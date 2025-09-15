// app.go: Wails 暴露给前端的方法集合。
// 说明：定义应用层 API（如 GetAvailablePorts、GetElectricalData、StartPolling 等），供前端通过 window.go.main.App 调用。
// 目的：前端与后端交互的边界与主要入口；请勿随意修改暴露方法签名以免破坏前端调用。
package main

import (
	"context"
	"encoding/json"
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

// 辅助：将前端 stopBits/parity 转换为 goserial 类型
func parseStopBitsParity(stopBits int, parity string) (goserial.StopBits, goserial.Parity) {
	var sb goserial.StopBits
	if stopBits == 2 {
		sb = goserial.TwoStopBits
	} else {
		sb = goserial.OneStopBit
	}
	var p goserial.Parity
	switch parity {
	case "Even":
		p = goserial.EvenParity
	case "Odd":
		p = goserial.OddParity
	default:
		p = goserial.NoParity
	}
	return sb, p
}

// UpdateSerialConfig 更新串口配置 (Wails方法)
func (a *App) UpdateSerialConfig(port string, baudRate int, dataBits int, stopBits int, parity string, slaveID int) bool {
	sb, p := parseStopBitsParity(stopBits, parity)

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

// SaveSavedSerialConfig 将当前配置以快照形式持久化到后端（Wails方法）
func (a *App) SaveSavedSerialConfig(port string, baudRate int, dataBits int, stopBits int, parity string, slaveID int) bool {
	sb, p := parseStopBitsParity(stopBits, parity)

	cfg := &service.SerialConfig{
		Port:     port,
		BaudRate: baudRate,
		DataBits: dataBits,
		StopBits: sb,
		Parity:   p,
		SlaveID:  slaveID,
	}

	if err := a.service.SaveSavedSerialConfig(cfg); err != nil {
		log.Printf("保存串口快照失败: %v", err)
		return false
	}
	return true
}

// LoadSavedSerialConfig 从后端加载已保存的快照并以 JSON 字符串返回（Wails方法）
func (a *App) LoadSavedSerialConfig() string {
	cfg, err := a.service.LoadSavedSerialConfig()
	if err != nil {
		log.Printf("加载串口快照失败: %v", err)
		return ""
	}
	if cfg == nil {
		// 未保存
		return ""
	}

	// 将配置序列化为简单 JSON，以便前端直接使用
	out := map[string]interface{}{
		"port":     cfg.Port,
		"baudRate": cfg.BaudRate,
		"dataBits": cfg.DataBits,
		"stopBits": int(cfg.StopBits),
		"parity":   int(cfg.Parity),
		"slaveID":  cfg.SlaveID,
	}
	b, err := json.Marshal(out)
	if err != nil {
		log.Printf("序列化快照失败: %v", err)
		return ""
	}
	return string(b)
}

// ClearSavedSerialConfig 从后端移除持久化快照（Wails方法）
func (a *App) ClearSavedSerialConfig() bool {
	if err := a.service.ClearSavedSerialConfig(); err != nil {
		log.Printf("清除串口快照失败: %v", err)
		return false
	}
	return true
}
