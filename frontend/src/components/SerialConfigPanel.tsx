import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Card, 
  Text, 
  Input, 
  VStack,
  HStack,
  Alert,
  Button,
} from '@chakra-ui/react';
import { GetAvailablePorts, StartPolling, StopPolling, UpdateSerialConfig } from '../../wailsjs/go/main/App';
import { useAppStore, updateStatus } from '../hooks/usePolling';
import { toaster } from './ui/toaster';

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

const CustomSelect = ({ value, options, onChange, placeholder }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={selectRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #e2e8f0',
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
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '200px',
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
  const [slaveID, setSlaveID] = useState('0C');
  const [originalSlaveID, setOriginalSlaveID] = useState('0C');
  const [ports, setPorts] = useState<string[]>([]);
  const [config, setConfig] = useState<SerialConfig>({
    port: '',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'None',
    slaveID: 12,
  });
  
  const { status } = useAppStore();
  const isConnected = status.connected;

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

  const handleConfigUpdate = async (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    
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
        toaster.success({
          title: '配置更新',
          description: `${field} 已更新为 ${value}`,
        });
      } else {
        toaster.error({
          title: '配置失败',
          description: '更新配置失败',
        });
      }
    } catch (error: any) {
      toaster.error({
        title: '配置失败',
        description: error.message || '更新配置失败',
      });
    }
  };

  const handleSlaveIDChange = (value: string) => {
    setSlaveID(value.toUpperCase());
    if (!value.trim()) {
      toaster.warning({
        title: '从站地址为空',
        description: '请输入从站地址后再进行通信',
      });
    }
  };

  const handleSerialToggle = () => {
    if (isConnected) {
      console.log('停止串口...');
      updateStatus({ connected: false, errorMessage: '' });
      StopPolling().catch(console.error);
      toaster.success({
        title: '停止采集',
        description: '数据采集已停止',
      });
    } else {
      if (!config.port) {
        toaster.error({
          title: '配置错误',
          description: '请先选择串口',
        });
        return;
      }
      
      console.log('启动串口...', config);
      updateStatus({ connected: true, errorMessage: '' });
      StartPolling().then(result => {
        console.log('StartPolling result:', result);
        if (result) {
          toaster.success({
            title: '开始采集',
            description: '数据采集已开始',
          });
        } else {
          updateStatus({ connected: false, errorMessage: '启动失败' });
          toaster.error({
            title: '启动失败',
            description: '启动数据采集失败',
          });
        }
      }).catch(error => {
        console.error('StartPolling error:', error);
        updateStatus({ connected: false, errorMessage: error.message });
        toaster.error({
          title: '操作失败',
          description: error.message || '操作失败',
        });
      });
    }
  };

  return (
    <Card.Root bg="white" shadow="md" borderRadius="xl" border="1px" borderColor="gray.200">
      <Card.Header pb={2}>
        <HStack justify="space-between" align="center">
          <Text fontSize="lg" fontWeight="bold" color="gray.800">串口配置</Text>
          <Button
            size="sm"
            colorScheme={isConnected ? 'red' : 'green'}
            onClick={handleSerialToggle}
          >
            {isConnected ? '关闭串口' : '打开串口'}
          </Button>
          <Text fontSize="xs" color="gray.500">
            状态: {isConnected ? '已连接' : '未连接'}
          </Text>
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
            <Text fontSize="sm" mb={2}>从站地址</Text>
            <Input
              placeholder="请输入从站地址 (如: 0C)"
              value={slaveID}
              onChange={(e) => handleSlaveIDChange(e.target.value)}
              onBlur={() => {
                if (slaveID.trim() && slaveID !== originalSlaveID) {
                  const id = parseInt(slaveID, 16);
                  if (!isNaN(id) && id > 0 && id < 256) {
                    handleConfigUpdate('slaveID', id);
                    setOriginalSlaveID(slaveID);
                  } else {
                    toaster.error({
                      title: '无效地址',
                      description: '从站地址必须为 01-FF 之间的十六进制数字',
                    });
                    setSlaveID(originalSlaveID);
                  }
                }
              }}
            />
            {!slaveID.trim() && (
              <Alert.Root status="warning" size="sm" mt={2}>
                <Alert.Description>请输入从站地址</Alert.Description>
              </Alert.Root>
            )}
          </Box>

          {/* 波特率 */}
          <Box>
            <Text fontSize="sm" mb={2}>波特率</Text>
            <CustomSelect
              value={config.baudRate.toString()}
              options={[
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
  );
};