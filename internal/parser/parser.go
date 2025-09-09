package parser

import (
	"DDSUViewer/internal/registers"
)

// DataParser 数据解析器
type DataParser struct{}

// NewDataParser 创建数据解析器
func NewDataParser() *DataParser {
	return &DataParser{}
}

// FilterElectricalData 过滤电参量数据
func (p *DataParser) FilterElectricalData(data *registers.ElectricalData) *registers.ElectricalData {
	if data == nil {
		return nil
	}

	filtered := &registers.ElectricalData{}

	// 过滤电压
	if registers.IsValidFloat32(data.Voltage) && data.Voltage >= 0 && data.Voltage <= 1000 {
		filtered.Voltage = data.Voltage
	}

	// 过滤电流
	if registers.IsValidFloat32(data.Current) && data.Current >= 0 && data.Current <= 100 {
		filtered.Current = data.Current
	}

	// 过滤有功功率
	if registers.IsValidFloat32(data.ActivePower) {
		filtered.ActivePower = data.ActivePower
	}

	// 过滤无功功率
	if registers.IsValidFloat32(data.ReactivePower) {
		filtered.ReactivePower = data.ReactivePower
	}

	// 过滤视在功率
	if registers.IsValidFloat32(data.ApparentPower) && data.ApparentPower >= 0 {
		filtered.ApparentPower = data.ApparentPower
	}

	// 过滤功率因数
	if registers.IsValidFloat32(data.PowerFactor) && data.PowerFactor >= -1 && data.PowerFactor <= 1 {
		filtered.PowerFactor = data.PowerFactor
	}

	// 过滤频率
	if registers.IsValidFloat32(data.Frequency) && data.Frequency >= 45 && data.Frequency <= 65 {
		filtered.Frequency = data.Frequency
	}

	// 过滤有功总电能
	if registers.IsValidFloat32(data.ActiveEnergy) && data.ActiveEnergy >= 0 {
		filtered.ActiveEnergy = data.ActiveEnergy
	}

	return filtered
}