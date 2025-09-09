import { useQuery } from '@apollo/client';
import { Box, Card, Text, Badge, VStack, HStack } from '@chakra-ui/react';
import { GET_DEVICE_STATUS } from '../graphql/queries';
import { showErrorToast } from './ErrorToast';

interface DeviceStatus {
  connected: boolean;
  protocol: string;
  lastUpdate: string;
  errorMessage?: string;
}

export const StatusPanel = () => {
  const { data, loading } = useQuery<{ deviceStatus: DeviceStatus }>(
    GET_DEVICE_STATUS,
    { 
      pollInterval: 2000,
      onError: (error) => {
        showErrorToast('连接失败', `无法获取设备状态: ${error.message}`);
      }
    }
  );

  const status = data?.deviceStatus;

  return (
    <Card.Root>
      <Card.Header>
        <Text fontSize="lg" fontWeight="semibold">设备状态</Text>
      </Card.Header>
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* 连接状态 */}
          <HStack justify="space-between">
            <Text fontSize="sm">连接状态</Text>
            <Badge 
              colorScheme={status?.connected ? 'green' : 'red'}
              variant="solid"
            >
              {loading ? '检测中...' : (status?.connected ? '已连接' : '未连接')}
            </Badge>
          </HStack>

          {/* 协议识别 */}
          <HStack justify="space-between">
            <Text fontSize="sm">协议类型</Text>
            <Badge 
              colorScheme={status?.protocol === 'Modbus RTU' ? 'blue' : 'gray'}
              variant="outline"
            >
              {status?.protocol || '未识别'}
            </Badge>
          </HStack>

          {/* 最后更新时间 */}
          {status?.lastUpdate && (
            <Box>
              <Text fontSize="sm" color="gray.600">最后更新</Text>
              <Text fontSize="xs" color="gray.500">
                {new Date(status.lastUpdate).toLocaleString()}
              </Text>
            </Box>
          )}

          {/* 错误信息 */}
          {status?.errorMessage && (
            <Box>
              <Text fontSize="sm" color="red.600" mb={1}>错误信息</Text>
              <Text fontSize="xs" color="red.500" bg="red.50" p={2} borderRadius="md">
                {status.errorMessage}
              </Text>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};