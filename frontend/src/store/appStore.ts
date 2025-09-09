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
    this.dataInterval = window.setInterval(async () => {
      if (this.status.connected) {
        try {
          // 尝试获取真实数据
          const { GetElectricalData } = await import('../../wailsjs/go/main/App');
          const realData = await GetElectricalData();
          
          if (realData) {
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
            // 如果没有真实数据，使用模拟数据
            this.data = {
              voltage: 220 + Math.random() * 10,
              current: 5 + Math.random() * 2,
              activePower: 1000 + Math.random() * 200,
              reactivePower: 100 + Math.random() * 50,
              apparentPower: 1010 + Math.random() * 200,
              powerFactor: 0.95 + Math.random() * 0.05,
              frequency: 50 + Math.random() * 0.1,
              activeEnergy: 12345.67,
              timestamp: new Date().toISOString(),
            };
          }
        } catch (error) {
          // 如果获取失败，使用模拟数据
          this.data = {
            voltage: 220 + Math.random() * 10,
            current: 5 + Math.random() * 2,
            activePower: 1000 + Math.random() * 200,
            reactivePower: 100 + Math.random() * 50,
            apparentPower: 1010 + Math.random() * 200,
            powerFactor: 0.95 + Math.random() * 0.05,
            frequency: 50 + Math.random() * 0.1,
            activeEnergy: 12345.67,
            timestamp: new Date().toISOString(),
          };
        }
        this.notifyListeners();
      } else {
        this.data = null;
      }
    }, 1000);
  }
}

export const appStore = new AppStore();