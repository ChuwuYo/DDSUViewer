// frontend/src/store/appStore.ts: 全局状态与轮询逻辑。
// 说明：管理应用状态（连接状态、最新电参数据、配置快照等），并实现对后端 GetElectricalData 的定时轮询与数据校验/格式化逻辑。
// 目的：数据流向、轮询设计与状态同步，修改轮询间隔或逻辑需谨慎以免影响 UI 刷新。
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

  // 构造函数：创建 AppStore 实例并立即启动默认的数据轮询。
  // 注意：如果需要延迟或条件性启动轮询，请改为显式调用 startDataPolling。
  constructor() {
    this.startDataPolling();
  }

  // getStatus: 返回当前连接与设备状态的快照（浅拷贝），以避免外部直接修改内部状态对象。
  getStatus(): DeviceStatus {
    return { ...this.status };
  }
 
  // getData: 返回当前已格式化的电参量数据副本；若无数据则返回 null。
  // 返回值已在写入时经过 formatNumber 格式化，适合直接用于 UI 渲染。
  getData(): ElectricalData | null {
    return this.data ? { ...this.data } : null;
  }

  // updateStatus: 合并并更新部分状态字段，自动更新时间戳并通知订阅者。
  // 参数 newStatus: 部分 DeviceStatus 字段（connected/protocol/errorMessage 等）。
  updateStatus(newStatus: Partial<DeviceStatus>) {
    this.status = { ...this.status, ...newStatus, lastUpdate: new Date().toISOString() };
    this.notifyListeners();
  }

  // subscribe: 添加订阅回调并返回注销函数。
  // 订阅者将在状态或数据变化时被调用（同步调用 notifyListeners）。
  // 返回值为一个函数，调用它可取消订阅（从 listeners 集合移除回调）。
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // notifyListeners: 同步触发所有订阅回调。
  // 注意：订阅回调应尽量快速执行，避免阻塞通知链；若需异步处理，回调内部应使用异步调度。
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // startDataPolling: 启动周期性拉取后端数据的轮询任务。
  // - 使用 window.setInterval 定时调用后端导出方法 GetElectricalData（通过 Wails Runtime 暴露）。
  // - 仅在 status.connected 为 true 时尝试拉取，拉取成功且通过 isValidElectricalData 校验后会格式化并更新 data，然后通知订阅者。
  // - 若拉取失败或校验未通过，则尝试保留上一次有效数据以避免 UI 闪烁；若此前没有有效数据，则将 data 置空并通知。
  // - 默认轮询间隔为 1000ms；如需更改频率或使用后端推送，请同步调整此处实现与订阅契约。
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

  // isValidElectricalData: 基础数据校验，判断后端返回的对象是否包含可用的电参量数据。
  // 参数 data: 后端返回的原始电参量对象（未经格式化）。
  // 返回值: 布尔，true 表示至少包含一个合理的主要参数（电压/频率/电流/功率/电能）并可用于 UI 显示。
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

  // formatNumber: 将数值四舍五入并返回指定小数位数的数字（用于 UI 显示）。
  // - 对于 undefined/null/非数值返回 0，避免组件出现 NaN。
  // 参数 value: 原始数字；decimals: 保留小数位数。
  private formatNumber(value: number | undefined, decimals: number): number {
    if (value === undefined || value === null || isNaN(value)) {
      return 0;
    }
    return Number(value.toFixed(decimals));
  }
}

export const appStore = new AppStore();