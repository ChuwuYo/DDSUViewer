package graphql

import (
	"DDSUViewer/internal/service"
	goserial "go.bug.st/serial"
)

// ConvertElectricalData 转换电参量数据
func ConvertElectricalData(data *service.ElectricalData) *ElectricalData {
	if data == nil {
		return nil
	}
	return &ElectricalData{
		Voltage:       data.Voltage,
		Current:       data.Current,
		ActivePower:   data.ActivePower,
		ReactivePower: data.ReactivePower,
		ApparentPower: data.ApparentPower,
		PowerFactor:   data.PowerFactor,
		Frequency:     data.Frequency,
		ActiveEnergy:  data.ActiveEnergy,
		Timestamp:     data.Timestamp.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// ConvertSerialConfigInput 转换串口配置输入
func ConvertSerialConfigInput(input SerialConfigInput) *service.SerialConfig {
	return &service.SerialConfig{
		Port:     input.Port,
		BaudRate: input.BaudRate,
		DataBits: input.DataBits,
		StopBits: parseStopBits(input.StopBits),
		Parity:   parseParity(input.Parity),
		SlaveID:  input.SlaveID,
	}
}

// ConvertSerialConfig 转换串口配置输出
func ConvertSerialConfig(config *service.SerialConfig) *SerialConfig {
	if config == nil {
		return nil
	}
	return &SerialConfig{
		Port:     config.Port,
		BaudRate: config.BaudRate,
		DataBits: config.DataBits,
		StopBits: stopBitsToInt(config.StopBits),
		Parity:   parityToString(config.Parity),
		SlaveID:  config.SlaveID,
	}
}

// parseStopBits 解析停止位
func parseStopBits(stopBits int) goserial.StopBits {
	switch stopBits {
	case 2:
		return goserial.TwoStopBits
	default:
		return goserial.OneStopBit
	}
}

// parseParity 解析校验位
func parseParity(parity string) goserial.Parity {
	switch parity {
	case "Even":
		return goserial.EvenParity
	case "Odd":
		return goserial.OddParity
	default:
		return goserial.NoParity
	}
}

// stopBitsToInt 停止位转整数
func stopBitsToInt(stopBits goserial.StopBits) int {
	switch stopBits {
	case goserial.TwoStopBits:
		return 2
	default:
		return 1
	}
}

// parityToString 校验位转字符串
func parityToString(parity goserial.Parity) string {
	switch parity {
	case goserial.EvenParity:
		return "Even"
	case goserial.OddParity:
		return "Odd"
	default:
		return "None"
	}
}