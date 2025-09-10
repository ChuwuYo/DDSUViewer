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

// FilterElectricalData 过滤电参量数据，适配小数值场景
func (p *DataParser) FilterElectricalData(data *registers.ElectricalData) *registers.ElectricalData {
	if data == nil {
		return nil
	}

	// 创建数据副本进行过滤
	filtered := &registers.ElectricalData{
		Voltage:       data.Voltage,
		Current:       data.Current,
		ActivePower:   data.ActivePower,
		ReactivePower: data.ReactivePower,
		ApparentPower: data.ApparentPower,
		PowerFactor:   data.PowerFactor,
		Frequency:     data.Frequency,
		ActiveEnergy:  data.ActiveEnergy,
	}

	// 应用极宽松的数据过滤规则，支持所有合理数值
	// 电压范围：-1000V - 无上限
	if filtered.Voltage < -1000.0 {
		filtered.Voltage = 0
	}

	// 电流范围：-1000A - 无上限
	if filtered.Current < -1000.0 {
		filtered.Current = 0
	}

	// 有功功率范围：-1000W - 无上限
	if filtered.ActivePower < -1000.0 {
		filtered.ActivePower = 0
	}

	// 无功功率范围：-1000W - 无上限
	if filtered.ReactivePower < -1000.0 {
		filtered.ReactivePower = 0
	}

	// 视在功率范围：-1000W - 无上限
	if filtered.ApparentPower < -1000.0 {
		filtered.ApparentPower = 0
	}

	// 频率范围：-1000Hz - 无上限
	if filtered.Frequency < -1000.0 {
		filtered.Frequency = 0
	}

	// 功率因数范围：-1000 - 无上限
	if filtered.PowerFactor < -1000.0 {
		filtered.PowerFactor = 0
	}

	// 电能值：-1000kWh - 无上限
	if filtered.ActiveEnergy < -1000.0 {
		filtered.ActiveEnergy = 0
	}

	return filtered
}