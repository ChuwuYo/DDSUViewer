import { Box, Card, Text, Badge, VStack, HStack } from '@chakra-ui/react';
import { useAppStore } from '../hooks/usePolling';

export const StatusPanel = () => {
  const { status } = useAppStore();

  return (
    <Card.Root bg="white" shadow="md" borderRadius="xl" border="1px" borderColor="gray.200">
      <Card.Header pb={2}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">设备状态</Text>
      </Card.Header>
      <Card.Body pt={2}>
        <VStack gap={4} align="stretch">
          {/* 连接状态 */}
          <HStack justify="space-between">
            <Text fontSize="sm">连接状态</Text>
            <Badge 
              colorScheme={status.connected ? 'green' : 'red'}
              variant="solid"
              px={2}
              textAlign="center"
            >
              {status.connected ? '已连接' : '未连接'}
            </Badge>
          </HStack>

          {/* 协议识别 */}
          <HStack justify="space-between">
            <Text fontSize="sm">协议类型</Text>
            <Badge 
              colorScheme={status.protocol === 'Modbus RTU' ? 'blue' : 'gray'}
              variant="outline"
              minW="80px"
              textAlign="center"
            >
              {status.protocol}
            </Badge>
          </HStack>

          {/* 最后更新时间 */}
          <Box>
            <Text fontSize="sm" color="gray.600">最后更新</Text>
            <Text fontSize="xs" color="gray.500">
              {new Date(status.lastUpdate).toLocaleString()}
            </Text>
          </Box>

          {/* 错误信息 */}
          {status.errorMessage && (
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