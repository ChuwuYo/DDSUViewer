// frontend/src/components/StatusPanel.tsx: 连接与状态面板。
// 说明：显示当前串口连接状态、轮询状态与简要错误信息，帮助用户了解系统健康状况。
// 目的：将诊断信息呈现给用户，并在出现连接问题时提供简单反馈。
import { Box, Card, Text, Badge, VStack, HStack } from '@chakra-ui/react';
import { useAppStore } from '../hooks/usePolling';
import { mdColors } from '../theme/colors';

export const StatusPanel = () => {
  const { status } = useAppStore();

  return (
    <Card.Root bg={mdColors.surface} shadow="md" borderRadius="xl" border="1px" borderColor={mdColors.outlineVariant}>
      <Card.Header pb={2}>
        <Text fontSize="lg" fontWeight="bold" color={mdColors.onSurface}>设备状态</Text>
      </Card.Header>
      <Card.Body pt={2}>
        <VStack gap={4} align="stretch">
          {/* 连接状态 */}
          <HStack justify="space-between">
            <Text fontSize="sm">连接状态</Text>
            <Badge 
              bg={status.connected ? mdColors.secondaryContainer : mdColors.errorContainer}
              color={status.connected ? mdColors.onSecondaryContainer : mdColors.error}
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
              bg={mdColors.primaryContainer}
              color={mdColors.onPrimaryContainer}
              minW="80px"
              textAlign="center"
            >
              {status.protocol}
            </Badge>
          </HStack>

          {/* 最后更新时间 */}
          <Box>
            <Text fontSize="sm" color={mdColors.onSurfaceVariant}>最后更新</Text>
            <Text fontSize="xs" color={mdColors.outline}>
              {new Date(status.lastUpdate).toLocaleString()}
            </Text>
          </Box>

          {/* 错误信息 */}
          {status.errorMessage && (
            <Box>
              <Text fontSize="sm" color={mdColors.error} mb={1}>错误信息</Text>
              <Text fontSize="xs" color={mdColors.error} bg={mdColors.errorContainer} p={2} borderRadius="md">
                {status.errorMessage}
              </Text>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};