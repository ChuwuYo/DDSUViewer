package graphql

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

