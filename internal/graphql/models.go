package graphql

import (
	"time"
	"DDSUViewer/internal/registers"
)

// ElectricalData 电参量数据
type ElectricalData struct {
	Voltage       float64 `json:"voltage"`
	Current       float64 `json:"current"`
	ActivePower   float64 `json:"activePower"`
	ReactivePower float64 `json:"reactivePower"`
	ApparentPower float64 `json:"apparentPower"`
	PowerFactor   float64 `json:"powerFactor"`
	Frequency     float64 `json:"frequency"`
	ActiveEnergy  float64 `json:"activeEnergy"`
	Timestamp     string  `json:"timestamp"`
}

// DeviceStatus 设备状态
type DeviceStatus struct {
	Connected    bool    `json:"connected"`
	Protocol     string  `json:"protocol"`
	LastUpdate   string  `json:"lastUpdate"`
	ErrorMessage *string `json:"errorMessage"`
}

// SerialConfig 串口配置
type SerialConfig struct {
	Port     string `json:"port"`
	BaudRate int    `json:"baudRate"`
	DataBits int    `json:"dataBits"`
	StopBits int    `json:"stopBits"`
	Parity   string `json:"parity"`
	SlaveID  int    `json:"slaveID"`
}

// SerialConfigInput 串口配置输入
type SerialConfigInput struct {
	Port     string `json:"port"`
	BaudRate int    `json:"baudRate"`
	DataBits int    `json:"dataBits"`
	StopBits int    `json:"stopBits"`
	Parity   string `json:"parity"`
	SlaveID  int    `json:"slaveID"`
}

// ConvertElectricalData 转换电参量数据
func ConvertElectricalData(data *registers.ElectricalData) *ElectricalData {
	if data == nil {
		return nil
	}
	
	return &ElectricalData{
		Voltage:       float64(data.Voltage),
		Current:       float64(data.Current),
		ActivePower:   float64(data.ActivePower),
		ReactivePower: float64(data.ReactivePower),
		ApparentPower: float64(data.ApparentPower),
		PowerFactor:   float64(data.PowerFactor),
		Frequency:     float64(data.Frequency),
		ActiveEnergy:  float64(data.ActiveEnergy),
		Timestamp:     time.Now().Format(time.RFC3339),
	}
}