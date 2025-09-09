import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { 
  Box, 
  Card, 
  Text, 
  Input, 
  VStack,
  HStack,
  Alert,
  NativeSelectRoot,
  NativeSelectField
} from '@chakra-ui/react';
import { GET_SERIAL_CONFIG, GET_AVAILABLE_PORTS } from '../graphql/queries';
import { UPDATE_SERIAL_CONFIG } from '../graphql/mutations';
import { showErrorToast, showWarningToast, showSuccessToast } from './ErrorToast';

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
  const [slaveID, setSlaveID] = useState('');

  const { data: configData } = useQuery<{ serialConfig: SerialConfig }>(GET_SERIAL_CONFIG, {
    onError: (error: any) => {
      showErrorToast('连接失败', `无法获取串口配置: ${error.message}`);
    }
  });
  const { data: portsData } = useQuery<{ availablePorts: string[] }>(GET_AVAILABLE_PORTS, {
    onError: (error: any) => {
      showErrorToast('连接失败', `无法枚举串口: ${error.message}`);
    }
  });
  const [updateConfig] = useMutation(UPDATE_SERIAL_CONFIG);

  const config = configData?.serialConfig;
  const ports = portsData?.availablePorts || [];

  useEffect(() => {
    if (config?.slaveID) {
      setSlaveID(config.slaveID.toString());
    }
  }, [config]);

  const handleConfigUpdate = async (field: string, value: any) => {
    try {
      await updateConfig({
        variables: { input: { [field]: value } }
      });
      showSuccessToast('配置更新', `${field} 已更新为 ${value}`);
    } catch (error: any) {
      showErrorToast('配置失败', `无法更新 ${field}: ${error.message}`);
    }
  };

  const handleSlaveIDChange = (value: string) => {
    setSlaveID(value);
    if (!value.trim()) {
      showWarningToast('从站地址为空', '请输入从站地址后再进行通信');
    }
  };

  return (
    <Card.Root>
      <Card.Header>
        <Text fontSize="lg" fontWeight="semibold">串口配置</Text>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* COM 端口 */}
          <Box>
            <Text fontSize="sm" mb={2}>COM 端口</Text>
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
              placeholder="请输入从站地址 (如: 12)"
              value={slaveID}
              onChange={(e) => handleSlaveIDChange(e.target.value)}
              onBlur={() => {
                if (slaveID.trim()) {
                  const id = parseInt(slaveID);
                  if (!isNaN(id) && id > 0 && id < 256) {
                    handleConfigUpdate('slaveID', id);
                  } else {
                    showErrorToast('无效地址', '从站地址必须为 1-255 之间的数字');
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