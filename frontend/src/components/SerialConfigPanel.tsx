import { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  Text, 
  Input, 
  VStack,
  HStack,
  Alert,
  Select,
  Button,
  Portal,
  createListCollection,
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

interface ValueChangeDetails {
  value: string[];
}

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
            <Select.Root 
              collection={createListCollection({ items: ports.map(port => ({ label: port, value: port })) })}
              value={config?.port ? [config.port] : []}
              onValueChange={(details: ValueChangeDetails) => handleConfigUpdate('port', details.value[0])}
              size="sm"
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="选择端口" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {ports.map(port => (
                      <Select.Item key={port} item={{ label: port, value: port }}>
                        {port}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
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
            <Select.Root 
              collection={createListCollection({ items: [
                { label: '4800', value: '4800' },
                { label: '9600', value: '9600' },
                { label: '19200', value: '19200' },
                { label: '38400', value: '38400' },
                { label: '115200', value: '115200' }
              ] })}
              value={[config?.baudRate?.toString() || '9600']}
              onValueChange={(details: ValueChangeDetails) => handleConfigUpdate('baudRate', parseInt(details.value[0]))}
              size="sm"
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {['4800', '9600', '19200', '38400', '115200'].map(rate => (
                      <Select.Item key={rate} item={{ label: rate, value: rate }}>
                        {rate}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </Box>

          {/* 数据位 */}
          <Box>
            <Text fontSize="sm" mb={2}>数据位</Text>
            <Select.Root 
              collection={createListCollection({ items: [
                { label: '7', value: '7' },
                { label: '8', value: '8' }
              ] })}
              value={[config?.dataBits?.toString() || '8']}
              onValueChange={(details: ValueChangeDetails) => handleConfigUpdate('dataBits', parseInt(details.value[0]))}
              size="sm"
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {['7', '8'].map(bits => (
                      <Select.Item key={bits} item={{ label: bits, value: bits }}>
                        {bits}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </Box>

          {/* 停止位 */}
          <Box>
            <Text fontSize="sm" mb={2}>停止位</Text>
            <Select.Root 
              collection={createListCollection({ items: [
                { label: '1', value: '1' },
                { label: '2', value: '2' }
              ] })}
              value={[config?.stopBits?.toString() || '1']}
              onValueChange={(details: ValueChangeDetails) => handleConfigUpdate('stopBits', parseInt(details.value[0]))}
              size="sm"
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {['1', '2'].map(bits => (
                      <Select.Item key={bits} item={{ label: bits, value: bits }}>
                        {bits}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </Box>

          {/* 校验位 */}
          <Box>
            <Text fontSize="sm" mb={2}>校验位</Text>
            <Select.Root 
              collection={createListCollection({ items: [
                { label: 'None', value: 'None' },
                { label: 'Even', value: 'Even' },
                { label: 'Odd', value: 'Odd' }
              ] })}
              value={[config?.parity || 'None']}
              onValueChange={(details: ValueChangeDetails) => handleConfigUpdate('parity', details.value[0])}
              size="sm"
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    {['None', 'Even', 'Odd'].map(parity => (
                      <Select.Item key={parity} item={{ label: parity, value: parity }}>
                        {parity}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </Box>

        </VStack>
      </Card.Body>

    </Card.Root>
  );
};