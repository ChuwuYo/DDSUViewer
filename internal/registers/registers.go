package registers

import (
	"encoding/binary"
	"math"
)

// 寄存器地址定义
const (
	RegVoltage    = 0x2000 // 电压 U
	RegCurrent    = 0x2002 // 电流 I
	RegActivePower = 0x2004 // 有功功率 P
	RegReactivePower = 0x2006 // 无功功率 Q
	RegApparentPower = 0x2008 // 视在功率 S
	RegPowerFactor = 0x200A // 功率因数 PF
	RegFrequency  = 0x200E // 频率 Freq
	RegActiveEnergy = 0x4000 // 有功总电能 Ep
)

// DataPoint 数据点
type DataPoint struct {
	Name     string
	Address  uint16
	Value    float32
	Unit     string
}

// ElectricalData 电参量数据
type ElectricalData struct {
	Voltage       float32 // 电压 V
	Current       float32 // 电流 A
	ActivePower   float32 // 有功功率 W
	ReactivePower float32 // 无功功率 VAR
	ApparentPower float32 // 视在功率 VA
	PowerFactor   float32 // 功率因数
	Frequency     float32 // 频率 Hz
	ActiveEnergy  float32 // 有功总电能 kWh
}

// GetDataPoints 获取所有数据点定义
func GetDataPoints() []DataPoint {
	return []DataPoint{
		{Name: "电压", Address: RegVoltage, Unit: "V"},
		{Name: "电流", Address: RegCurrent, Unit: "A"},
		{Name: "有功功率", Address: RegActivePower, Unit: "W"},
		{Name: "无功功率", Address: RegReactivePower, Unit: "VAR"},
		{Name: "视在功率", Address: RegApparentPower, Unit: "VA"},
		{Name: "功率因数", Address: RegPowerFactor, Unit: ""},
		{Name: "频率", Address: RegFrequency, Unit: "Hz"},
		{Name: "有功总电能", Address: RegActiveEnergy, Unit: "kWh"},
	}
}

// ParseFloat32 解析IEEE754浮点数
func ParseFloat32(data []byte) float32 {
	if len(data) < 4 {
		return 0
	}
	
	// Modbus寄存器高位在前，需要调整字节序
	bytes := make([]byte, 4)
	bytes[0] = data[1] // 第一个寄存器低字节
	bytes[1] = data[0] // 第一个寄存器高字节
	bytes[2] = data[3] // 第二个寄存器低字节
	bytes[3] = data[2] // 第二个寄存器高字节
	
	bits := binary.LittleEndian.Uint32(bytes)
	return math.Float32frombits(bits)
}

// IsValidFloat32 检查浮点数是否有效
func IsValidFloat32(value float32) bool {
	return !math.IsNaN(float64(value)) && !math.IsInf(float64(value), 0)
}

// ParseElectricalData 解析电参量数据
func ParseElectricalData(regData map[uint16][]byte) *ElectricalData {
	data := &ElectricalData{}
	
	if regData[RegVoltage] != nil {
		data.Voltage = ParseFloat32(regData[RegVoltage])
	}
	if regData[RegCurrent] != nil {
		data.Current = ParseFloat32(regData[RegCurrent])
	}
	if regData[RegActivePower] != nil {
		data.ActivePower = ParseFloat32(regData[RegActivePower])
	}
	if regData[RegReactivePower] != nil {
		data.ReactivePower = ParseFloat32(regData[RegReactivePower])
	}
	if regData[RegApparentPower] != nil {
		data.ApparentPower = ParseFloat32(regData[RegApparentPower])
	}
	if regData[RegPowerFactor] != nil {
		data.PowerFactor = ParseFloat32(regData[RegPowerFactor])
	}
	if regData[RegFrequency] != nil {
		data.Frequency = ParseFloat32(regData[RegFrequency])
	}
	if regData[RegActiveEnergy] != nil {
		data.ActiveEnergy = ParseFloat32(regData[RegActiveEnergy])
	}
	
	return data
}