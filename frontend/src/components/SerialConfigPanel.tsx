import { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  Text, 
  Input, 
  VStack,
  HStack,
  Alert,
  NativeSelectRoot,
  NativeSelectField,
  Button,
} from '@chakra-ui/react';
import { GetAvailablePorts, StartPolling, StopPolling, UpdateSerialConfig } from '../../wailsjs/go/main/App';
import { showErrorToast, showWarningToast, showSuccessToast } from './ErrorToast';
import { useAppStore, updateStatus } from '../hooks/usePolling';

interface SerialConfig {
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
  slaveID: number;
}

export const SerialConfigPanel = () => {
  const [hexSend, setHexSend] = useState(false);
  const [hexDisplay, setHexDisplay] = useState(false);
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
        showSuccessToast('配置更新', `${field} 已更新为 ${value}`);
      } else {
        showErrorToast('配置失败', '更新配置失败');
      }
    } catch (error: any) {
      showErrorToast('配置失败', error.message || '更新配置失败');
    }
  };

  const handleSlaveIDChange = (value: string) => {
    setSlaveID(value.toUpperCase());
    if (!value.trim()) {
      showWarningToast('从站地址为空', '请输入从站地址后再进行通信');
    }
  };

  const handleSerialToggle = () => {
    if (isConnected) {
      console.log('停止串口...');
      updateStatus({ connected: false, errorMessage: '' });
      StopPolling().catch(console.error);
      showSuccessToast('停止采集', '数据采集已停止');
    } else {
      if (!config.port) {
        showErrorToast('配置错误', '请先选择串口');
        return;
      }
      
      console.log('启动串口...', config);
      updateStatus({ connected: true, errorMessage: '' });
      StartPolling().then(result => {
        console.log('StartPolling result:', result);
        if (result) {
          showSuccessToast('开始采集', '数据采集已开始');
        } else {
          updateStatus({ connected: false, errorMessage: '启动失败' });
          showErrorToast('启动失败', '启动数据采集失败');
        }
      }).catch(error => {
        console.error('StartPolling error:', error);
        updateStatus({ connected: false, errorMessage: error.message });
        showErrorToast('操作失败', error.message || '操作失败');
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
            <NativeSelectRoot>
              <NativeSelectField 
                value={config?.port || ''} 
                onChange={(e) => handleConfigUpdate('port', e.target.value)}
              >
                <option value="">选择端口</option>
                {ports.map(port => (
                  <option key={port} value={port}>{port}</option>
                ))}
              </NativeSelectField>
            </NativeSelectRoot>
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
                    showErrorToast('无效地址', '从站地址必须为 01-FF 之间的十六进制数字');
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
            <NativeSelectRoot>
              <NativeSelectField 
                value={config?.baudRate?.toString() || '9600'}
                onChange={(e) => handleConfigUpdate('baudRate', parseInt(e.target.value))}
              >
                <option value="4800">4800</option>
                <option value="9600">9600</option>
                <option value="19200">19200</option>
                <option value="38400">38400</option>
                <option value="115200">115200</option>
              </NativeSelectField>
            </NativeSelectRoot>
          </Box>

          {/* 数据位 */}
          <Box>
            <Text fontSize="sm" mb={2}>数据位</Text>
            <NativeSelectRoot>
              <NativeSelectField 
                value={config?.dataBits?.toString() || '8'}
                onChange={(e) => handleConfigUpdate('dataBits', parseInt(e.target.value))}
              >
                <option value="7">7</option>
                <option value="8">8</option>
              </NativeSelectField>
            </NativeSelectRoot>
          </Box>

          {/* 停止位 */}
          <Box>
            <Text fontSize="sm" mb={2}>停止位</Text>
            <NativeSelectRoot>
              <NativeSelectField 
                value={config?.stopBits?.toString() || '1'}
                onChange={(e) => handleConfigUpdate('stopBits', parseInt(e.target.value))}
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </NativeSelectField>
            </NativeSelectRoot>
          </Box>

          {/* 校验位 */}
          <Box>
            <Text fontSize="sm" mb={2}>校验位</Text>
            <NativeSelectRoot>
              <NativeSelectField 
                value={config?.parity || 'None'}
                onChange={(e) => handleConfigUpdate('parity', e.target.value)}
              >
                <option value="None">None</option>
                <option value="Even">Even</option>
                <option value="Odd">Odd</option>
              </NativeSelectField>
            </NativeSelectRoot>
          </Box>

          {/* Hex 控制 */}
          <VStack gap={2} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm">Hex 发送</Text>
              <input 
                type="checkbox" 
                checked={hexSend} 
                onChange={(e) => setHexSend(e.target.checked)} 
              />
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm">Hex 显示</Text>
              <input 
                type="checkbox" 
                checked={hexDisplay} 
                onChange={(e) => setHexDisplay(e.target.checked)} 
              />
            </HStack>
          </VStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};