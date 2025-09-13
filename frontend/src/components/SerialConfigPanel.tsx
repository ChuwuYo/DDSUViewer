import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  Card, 
  Text, 
  Input, 
  VStack,
  HStack,
  Button,
} from '@chakra-ui/react';
import { GetAvailablePorts, StartPolling, StopPolling, UpdateSerialConfig } from '../../wailsjs/go/main/App';
import { useAppStore, updateStatus } from '../hooks/usePolling';
import { mdColors } from '../theme/colors';

interface SerialConfig {
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
  slaveID: number;
}

interface CustomSelectProps {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(onClose, 280); // Wait for animation to complete
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const colors = {
    success: { bg: '#38a169', border: '#2f855a' },
    error: { bg: mdColors.error, border: '#c53030' },
    warning: { bg: '#dd6b20', border: '#c05621' }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: colors[type].bg,
        color: 'white',
        padding: '12px 16px',
        borderRadius: '6px',
        border: `1px solid ${colors[type].border}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 9999,
        fontSize: '14px',
        maxWidth: '300px',
        animation: isClosing ? 'slideOut 0.3s ease-in forwards' : 'slideIn 0.3s ease-out'
      }}
    >
      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `}
      </style>
      {message}
    </div>
  );
};

const CustomSelect = ({ value, options, onChange, placeholder }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number>(200);
  const selectRef = useRef<HTMLDivElement>(null);

  // 关闭时点击外部收起
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 根据当前元素位置以及窗口空间计算展开方向和最大高度
  const computeDropdownPosition = useCallback(() => {
    const DROPDOWN_MAX_HEIGHT = 200;
    const DROPDOWN_MIN_HEIGHT = 40;
    const DROPDOWN_VIEWPORT_MARGIN = 8;
    const ESTIMATED_ITEM_HEIGHT = 40; // 每项估算高度（包括间距），可根据样式微调

    if (!selectRef.current) return;
    const rect = selectRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const desiredHeight = Math.min(DROPDOWN_MAX_HEIGHT, options.length * ESTIMATED_ITEM_HEIGHT);

    if (spaceBelow >= desiredHeight) {
      setOpenUp(false);
      setDropdownMaxHeight(Math.min(desiredHeight, Math.max(DROPDOWN_MIN_HEIGHT, spaceBelow - DROPDOWN_VIEWPORT_MARGIN)));
      return;
    }

    if (spaceAbove >= desiredHeight) {
      setOpenUp(true);
      setDropdownMaxHeight(Math.min(desiredHeight, Math.max(DROPDOWN_MIN_HEIGHT, spaceAbove - DROPDOWN_VIEWPORT_MARGIN)));
      return;
    }

    // 两边都不足，选择可用空间更大的方向并尽量适配
    if (spaceBelow >= spaceAbove) {
      setOpenUp(false);
      setDropdownMaxHeight(Math.max(DROPDOWN_MIN_HEIGHT, spaceBelow - DROPDOWN_VIEWPORT_MARGIN));
    } else {
      setOpenUp(true);
      setDropdownMaxHeight(Math.max(DROPDOWN_MIN_HEIGHT, spaceAbove - DROPDOWN_VIEWPORT_MARGIN));
    }
  }, [options.length]);

  // 在打开时计算位置，同时绑定 resize/scroll 以动态调整
  useEffect(() => {
    if (!isOpen) return;
    computeDropdownPosition();
    const handleWindowChange = () => computeDropdownPosition();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true); // 捕获滚动容器变化
    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [isOpen, computeDropdownPosition]);

  const selectedOption = options.find(opt => opt.value === value);

  const toggleOpen = () => {
    // 如果将要打开，先计算方向
    if (!isOpen) {
      computeDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div ref={selectRef} style={{ position: 'relative' }}>
      <div
        onClick={toggleOpen}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: `1px solid ${mdColors.outlineVariant}`,
          borderRadius: '6px',
          fontSize: '14px',
          backgroundColor: 'white',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span style={{ color: selectedOption ? '#000' : '#a0aec0' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: openUp ? undefined : '100%',
            bottom: openUp ? '100%' : undefined,
            backgroundColor: 'white',
            border: `1px solid ${mdColors.outlineVariant}`,
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: `${dropdownMaxHeight}px`,
            overflowY: 'auto'
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                backgroundColor: option.value === value ? '#f7fafc' : 'white',
                borderBottom: '1px solid #f7fafc'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f7fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = option.value === value ? '#f7fafc' : 'white';
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SerialConfigPanel = () => {
  const LOCAL_STORAGE_KEY = 'ddsuv_serial_config_v1';
  const SAVED_SERIAL_KEY = 'ddsuv_serial_config_saved_v1';
  const [slaveID, setSlaveID] = useState('');
  const [originalSlaveID, setOriginalSlaveID] = useState('');
  const [ports, setPorts] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [config, setConfig] = useState<SerialConfig>({
    port: '',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'None',
    // 默认不预填从站地址
    slaveID: 0,
  });
  
  const { status } = useAppStore();
  const isConnected = status.connected;
 
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
  }, []);

  // 从 localStorage 加载持久化的串口配置（优先使用已保存的快照）
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(SAVED_SERIAL_KEY);
      if (savedRaw && savedRaw !== '') {
        // 存在已保存的快照，优先使用它作为当前配置（用户已选择“保存当前的串口配置”）
        const parsed = JSON.parse(savedRaw) as Partial<SerialConfig>;
        setConfig(cfg => ({ ...cfg, ...parsed }));
        try {
          // 将快照持久化为当前配置键，保证下次启动也能读取到
          // 仅在快照包含有效端口或有效从站地址 (>0) 时写入，避免把空/默认 slaveID(0) 覆盖本地配置导致显示 "00"
          const shouldPersist = (parsed.port && String(parsed.port).trim() !== '') || (parsed.slaveID !== undefined && Number(parsed.slaveID) > 0);
          if (shouldPersist) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          } else {
            // 如果快照中没有有意义的配置，确保当前配置键被清理
            localStorage.removeItem(LOCAL_STORAGE_KEY);
          }
        } catch {
          /* ignore */
        }
        // 仅当从站地址为正整数（1-255）时才显示其十六进制表示；
        // 如果为 0 或未设置，则保持输入为空，避免显示 "00"
        if (parsed.slaveID !== undefined && parsed.slaveID !== null && Number(parsed.slaveID) > 0) {
          const hex = Number(parsed.slaveID).toString(16).toUpperCase().padStart(2, '0');
          setSlaveID(hex);
          setOriginalSlaveID(hex);
        }
        return;
      }

      // 否则回退到常规模式的当前配置键
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SerialConfig>;
        setConfig(cfg => ({ ...cfg, ...parsed }));
        // 仅当从站地址为正整数（1-255）时才显示其十六进制表示；
        if (parsed.slaveID !== undefined && parsed.slaveID !== null && Number(parsed.slaveID) > 0) {
          const hex = Number(parsed.slaveID).toString(16).toUpperCase().padStart(2, '0');
          setSlaveID(hex);
          setOriginalSlaveID(hex);
        }
      }
    } catch (e) {
      console.warn('读取持久化串口配置失败', e);
    }
  }, []);

  // 监听 SettingsModal 的恢复事件，立即应用已保存/当前配置
  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem(SAVED_SERIAL_KEY) || localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved) as Partial<SerialConfig>;
        setConfig(cfg => ({ ...cfg, ...parsed }));
        // 恢复时仅在 slaveID>0 时显示十六进制表示，0 表示“未设置”
        if (parsed.slaveID !== undefined && parsed.slaveID !== null && Number(parsed.slaveID) > 0) {
          const hex = Number(parsed.slaveID).toString(16).toUpperCase().padStart(2, '0');
          setSlaveID(hex);
          setOriginalSlaveID(hex);
        }
      } catch (e) {
        console.warn('恢复串口配置失败', e);
      }
    };
    window.addEventListener('ddsuv_serial_config_restored', handler as EventListener);
    return () => window.removeEventListener('ddsuv_serial_config_restored', handler as EventListener);
  }, []);

  useEffect(() => {
    const loadPorts = async () => {
      try {
        const availablePorts = await GetAvailablePorts();
        setPorts(availablePorts);
      } catch (error) {
        console.error('Failed to get ports:', error);
      }
    };
    loadPorts();
  }, []);

  const persistConfig = (c: SerialConfig) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(c));
    } catch (e) {
      console.warn('保存串口配置到 localStorage 失败', e);
    }
  };
 
  const handleConfigUpdate = async (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    // 立即持久化本地副本，保证刷新后仍能恢复用户设置
    persistConfig(newConfig);
    
    try {
      const result = await UpdateSerialConfig(
        newConfig.port,
        newConfig.baudRate,
        newConfig.dataBits,
        newConfig.stopBits,
        newConfig.parity,
        newConfig.slaveID
      );
      
      if (result) {
        showToast(`${field} 已更新为 ${value}`, 'success');
      } else {
        showToast('更新配置失败', 'error');
      }
    } catch (error: any) {
      showToast(error.message || '更新配置失败', 'error');
    }
  };

  const handleSlaveIDChange = (value: string) => {
    setSlaveID(value.toUpperCase());
    // 不在输入时显示警告，只在尝试连接时检查
  };

  const handleSerialToggle = () => {
    if (isConnected) {
      console.log('停止串口...');
      updateStatus({ connected: false, errorMessage: '' });
      StopPolling().catch(console.error);
      showToast('数据采集已停止', 'success');
    } else {
      if (!config.port) {
        showToast('请先选择串口', 'error');
        return;
      }
      
      if (!slaveID.trim()) {
        showToast('请先设置从站地址', 'error');
        return;
      }
      
      console.log('启动串口...', config);
      updateStatus({ connected: true, errorMessage: '' });
      StartPolling().then(result => {
        console.log('StartPolling result:', result);
        if (result) {
          showToast('数据采集已开始', 'success');
        } else {
          updateStatus({ connected: false, errorMessage: '启动失败' });
          showToast('启动数据采集失败', 'error');
        }
      }).catch(error => {
        console.error('StartPolling error:', error);
        updateStatus({ connected: false, errorMessage: error.message });
        showToast(error.message || '操作失败', 'error');
      });
    }
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Card.Root bg="white" shadow="md" borderRadius="xl" border="1px" borderColor="gray.200">
        <Card.Header pb={2}>
          <HStack justify="space-between" align="center">
            <Text fontSize="lg" fontWeight="bold" color="gray.800">串口配置</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label className="switch" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={isConnected}
                  onChange={() => {
                    handleSerialToggle();
                  }}
                  aria-label="打开或关闭串口"
                />
                <span className="slider" />
              </label>
              <Text fontSize="xs" color="gray.500">串口: {isConnected ? '已打开' : '未打开'}</Text>
            </div>
          </HStack>
        </Card.Header>
        <Card.Body pt={2}>
          <VStack gap={4} align="stretch">
            {/* COM 端口 */}
            <Box>
              <Text fontSize="sm" mb={2} fontWeight="medium" color="gray.700">COM 端口</Text>
              <CustomSelect
                value={config.port}
                options={ports.map(port => ({ label: port, value: port }))}
                onChange={(value) => handleConfigUpdate('port', value)}
                placeholder="选择端口"
              />
            </Box>

            {/* 从站地址 */}
            <Box>
              <Text fontSize="sm" mb={2}>从站地址 *</Text>
              <Input
                placeholder="必填：请输入从站地址 (十六进制，如: 0C)"
                value={slaveID}
                onChange={(e) => handleSlaveIDChange(e.target.value)}
                onBlur={() => {
                  if (slaveID.trim() && slaveID !== originalSlaveID) {
                    const id = parseInt(slaveID, 16);
                    if (!isNaN(id) && id > 0 && id < 256) {
                      handleConfigUpdate('slaveID', id);
                      setOriginalSlaveID(slaveID);
                    } else {
                      showToast('从站地址必须为 01-FF 之间的十六进制数字', 'error');
                      setSlaveID(originalSlaveID);
                    }
                  }
                }}
                borderColor={!slaveID.trim() ? "red.300" : "gray.200"}
              />
              {!slaveID.trim() && (
                <Text fontSize="xs" color="red.500" mt={1}>❗ 从站地址不能为空，请查看电能表</Text>
              )}
            </Box>

            {/* 波特率 */}
            <Box>
              <Text fontSize="sm" mb={2}>波特率</Text>
              <CustomSelect
                value={config.baudRate.toString()}
                options={[
                  { label: '2400', value: '2400' },
                  { label: '4800', value: '4800' },
                  { label: '9600', value: '9600' },
                  { label: '19200', value: '19200' },
                  { label: '38400', value: '38400' },
                  { label: '115200', value: '115200' }
                ]}
                onChange={(value) => handleConfigUpdate('baudRate', parseInt(value))}
              />
            </Box>

            {/* 数据位 */}
            <Box>
              <Text fontSize="sm" mb={2}>数据位</Text>
              <CustomSelect
                value={config.dataBits.toString()}
                options={[
                  { label: '7', value: '7' },
                  { label: '8', value: '8' }
                ]}
                onChange={(value) => handleConfigUpdate('dataBits', parseInt(value))}
              />
            </Box>

            {/* 停止位 */}
            <Box>
              <Text fontSize="sm" mb={2}>停止位</Text>
              <CustomSelect
                value={config.stopBits.toString()}
                options={[
                  { label: '1', value: '1' },
                  { label: '2', value: '2' }
                ]}
                onChange={(value) => handleConfigUpdate('stopBits', parseInt(value))}
              />
            </Box>

            {/* 校验位 */}
            <Box>
              <Text fontSize="sm" mb={2}>校验位</Text>
              <CustomSelect
                value={config.parity}
                options={[
                  { label: 'None', value: 'None' },
                  { label: 'Even', value: 'Even' },
                  { label: 'Odd', value: 'Odd' }
                ]}
                onChange={(value) => handleConfigUpdate('parity', value)}
              />
            </Box>

          </VStack>
        </Card.Body>

      </Card.Root>
    </>
  );
};