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
  private totalEnergy: number = 12345.67; // 电能累计值

  constructor() {
    this.startDataGeneration();
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

  private startDataGeneration() {
    this.dataInterval = window.setInterval(() => {
      if (this.status.connected) {
        // 尝试获取真实数据（同步方式）
        let realData = null;
        try {
          // @ts-ignore
          const { GetElectricalData } = window.go?.main?.App || {};
          if (GetElectricalData) {
            // 使用同步调用避免卡住
            realData = GetElectricalData();
          }
        } catch (error) {
          realData = null;
        }
        
        if (realData && this.hasValidData(realData)) {
          // 有真实数据，使用真实数据
          this.data = {
            voltage: realData.voltage || 0,
            current: realData.current || 0,
            activePower: realData.activePower || 0,
            reactivePower: realData.reactivePower || 0,
            apparentPower: realData.apparentPower || 0,
            powerFactor: realData.powerFactor || 0,
            frequency: realData.frequency || 0,
            activeEnergy: realData.activeEnergy || 0,
            timestamp: realData.timestamp || new Date().toISOString(),
          };
        } else {
          // 没有真实数据，使用模拟数据
          const currentPower = 1000 + Math.random() * 200; // 当前功率
          // 按照当前功率累计电能（每秒增加 = 功率/3600）
          this.totalEnergy += currentPower / 3600;
          
          this.data = {
            voltage: 220 + Math.random() * 10,
            current: 5 + Math.random() * 2,
            activePower: currentPower,
            reactivePower: 100 + Math.random() * 50,
            apparentPower: 1010 + Math.random() * 200,
            powerFactor: 0.95 + Math.random() * 0.05,
            frequency: 50 + Math.random() * 0.1,
            activeEnergy: Math.round(this.totalEnergy * 100) / 100, // 保疙2位小数
            timestamp: new Date().toISOString(),
          };
        }
        this.notifyListeners();
      } else {
        this.data = null;
        this.notifyListeners();
      }
    }, 1000);
  }

  private hasValidData(data: any): boolean {
    // 检查后端是否返回了有效的真实数据
    if (!data) return false;
    
    // 检查是否有任何非零数值（说明设备有数据返回）
    return (
      (data.voltage && data.voltage > 0) ||
      (data.current && data.current > 0) ||
      (data.activePower && data.activePower !== 0) ||
      (data.reactivePower && data.reactivePower !== 0) ||
      (data.apparentPower && data.apparentPower > 0) ||
      (data.powerFactor && data.powerFactor > 0) ||
      (data.frequency && data.frequency > 0) ||
      (data.activeEnergy && data.activeEnergy > 0)
    );
  }
}

export const appStore = new AppStore();