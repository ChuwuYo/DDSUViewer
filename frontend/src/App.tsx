import { Box, Heading, Grid, GridItem, Flex, Spacer, Badge, Image, Text } from '@chakra-ui/react';
import { ElectricalDataPanel } from './components/ElectricalDataPanel';
import { SerialConfigPanel } from './components/SerialConfigPanel';
import { StatusPanel } from './components/StatusPanel';
import { mdColors } from './theme/colors';

import './App.css';

function App() {
  return (
    <Box minH="100vh" bg={mdColors.background}>
      {/* 顶部标题栏 */}
      <Box bg={mdColors.surface} shadow="md" borderBottom="1px" borderColor={mdColors.outlineVariant}>
        <Box maxW="7xl" mx="auto" px={6} py={4}>
          <Flex align="center">
            <Flex align="center" gap={3}>
              <Image 
                src="/appicon.png" 
                alt="DDSU666 Logo" 
                boxSize="32px"
                objectFit="contain"
              />
              <Box>
                <Flex align="baseline" gap={2}>
                  <Text 
                    fontSize="xl" 
                    fontWeight="800" 
                    color={mdColors.primary}
                    letterSpacing="-0.5px"
                  >
                    DDSU666
                  </Text>
                  <Text 
                    fontSize="lg" 
                    fontWeight="500" 
                    color={mdColors.onSurfaceVariant}
                    letterSpacing="0.2px"
                  >
                    电能表上位机
                  </Text>
                </Flex>
                <Text 
                  fontSize="xs" 
                  color={mdColors.outline} 
                  fontWeight="400"
                  mt={-1}
                >
                  Power Meter Host Computer
                </Text>
              </Box>
            </Flex>
            <Spacer />
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
    </Box>
  );
}

export default App;
