import { Box, Heading, Grid, GridItem, Flex, Spacer, Badge } from '@chakra-ui/react';
import { ElectricalDataPanel } from './components/ElectricalDataPanel';
import { SerialConfigPanel } from './components/SerialConfigPanel';
import { StatusPanel } from './components/StatusPanel';
import { Toaster } from './components/ErrorToast';

import './App.css';

function App() {
  return (
    <Box minH="100vh" bg="gray.100">
      {/* 顶部标题栏 */}
      <Box bg="white" shadow="md" borderBottom="1px" borderColor="gray.200">
        <Box maxW="7xl" mx="auto" px={6} py={4}>
          <Flex align="center">
            <Heading size="lg" color="blue.600" fontWeight="bold">
              DDSU666 电能表上位机
            </Heading>
            <Spacer />
            <Badge colorScheme="green" variant="subtle" px={3} py={1}>
              在线监控
            </Badge>
          </Flex>
        </Box>
      </Box>

      {/* 主要内容区域 */}
      <Box maxW="7xl" mx="auto" p={6}>
        <Grid 
          templateColumns={{ base: "1fr", lg: "2fr 1fr" }} 
          gap={6}
          minH="calc(100vh - 120px)"
        >
          {/* 左侧：实时数据展示 */}
          <GridItem>
            <ElectricalDataPanel />
          </GridItem>

          {/* 右侧：状态监控和配置 */}
          <GridItem>
            <Flex direction="column" gap={6} h="full">
              <StatusPanel />
              <SerialConfigPanel />
            </Flex>
          </GridItem>
        </Grid>
      </Box>
      <Toaster />
    </Box>
  );
}

export default App;
