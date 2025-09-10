interface DeviceStatus {
  connected: boolean;
  protocol: string;
  lastUpdate: string;
  errorMessage?: string;
}

interface ElectricalData {
  voltage: number;
  current: number;
  activePower: number;
  reactivePower: number;
  apparentPower: number;
  powerFactor: number;
  frequency: number;
  activeEnergy: number;
  timestamp: string;
}

class AppStore {
  private status: DeviceStatus = {
    connected: false,
    protocol: 'Modbus RTU',
    lastUpdate: new Date().toISOString(),
  };

  private data: ElectricalData | null = null;
  private listeners: Set<() => void> = new Set();
  private dataInterval: number | null = null;

  constructor() {
    this.startDataPolling();
  }

  getStatus(): DeviceStatus {
    return { ...this.status };
  }

  getData(): ElectricalData | null {
    return this.data ? { ...this.data } : null;
  }

  updateStatus(newStatus: Partial<DeviceStatus>) {
    this.status = { ...this.status, ...newStatus, lastUpdate: new Date().toISOString() };
    this.notifyListeners();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  private startDataPolling() {
    this.dataInterval = window.setInterval(async () => {
      if (this.status.connected) {
        // 获取真实数据
        try {
          // @ts-ignore
          const { GetElectricalData } = window.go?.main?.App || {};
          if (GetElectricalData) {
            const realData = await GetElectricalData();
            if (realData && this.isValidElectricalData(realData)) {
              this.data = {
                voltage: this.formatNumber(realData.voltage, 1),
                current: this.formatNumber(realData.current, 6),
                activePower: this.formatNumber(realData.activePower, 3),
                reactivePower: this.formatNumber(realData.reactivePower, 3),
                apparentPower: this.formatNumber(realData.apparentPower, 3),
                powerFactor: this.formatNumber(realData.powerFactor, 3),
                frequency: this.formatNumber(realData.frequency, 2),
                activeEnergy: this.formatNumber(realData.activeEnergy, 3),
                timestamp: realData.timestamp || new Date().toISOString(),
              };
              this.notifyListeners();
            } else {
              // 保持上一次的有效数据，而不是清空
              if (!this.data) {
                this.data = null;
                this.notifyListeners();
              }
            }
          }
        } catch (error) {
          // 发生错误时保持上一次的数据，静默处理
        }
      } else {
        this.data = null;
        this.notifyListeners();
      }
    }, 1000);
  }

  // 验证电参量数据的有效性
  private isValidElectricalData(data: any): boolean {
    if (!data) return false;
    
    // 至少需要有一个有效的主要参数
    const hasValidVoltage = data.voltage && data.voltage > 0;
    const hasValidCurrent = data.current && data.current > 0;
    const hasValidPower = data.activePower && data.activePower > 0;
    const hasValidFrequency = data.frequency && data.frequency > 0;
    const hasValidEnergy = data.activeEnergy !== undefined && data.activeEnergy >= 0;
    
    // 至少需要电压或频率其中一个有效，表示设备通信正常
    let isValid = hasValidVoltage || hasValidFrequency;
    
    // 如果有电流或功率，也认为是有效数据
    if (hasValidCurrent || hasValidPower) {
      isValid = true;
    }
    
    // 如果只有电能数据也认为是有效的（可能是待机状态）
    if (hasValidEnergy && data.activeEnergy > 0) {
      isValid = true;
    }
    
    return isValid;
  }

  // 格式化数字，保留指定小数位数
  private formatNumber(value: number | undefined, decimals: number): number {
    if (value === undefined || value === null || isNaN(value)) {
      return 0;
    }
    return Number(value.toFixed(decimals));
  }
}

export const appStore = new AppStore();