import { ApolloProvider } from '@apollo/client/react';
import { Box, Heading, Grid, GridItem } from '@chakra-ui/react';
import { apolloClient } from './graphql/client';
import { ElectricalDataPanel } from './components/ElectricalDataPanel';
import { SerialConfigPanel } from './components/SerialConfigPanel';
import { StatusPanel } from './components/StatusPanel';
import { toaster } from './components/ErrorToast';
import './App.css';

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <Box p={6} minH="100vh" bg="gray.50">
        {/* 顶部标题栏 */}
        <Box mb={6} p={4} bg="white" borderRadius="lg" shadow="sm">
          <Heading as="h1" size="lg" color="blue.600">
            DDSU666 电能表上位机
          </Heading>
        </Box>

        {/* 主要内容区域 */}
        <Grid templateColumns="2fr 1fr" gap={6}>
          {/* 左侧：实时数据展示 */}
          <GridItem>
            <ElectricalDataPanel />
          </GridItem>

          {/* 右侧：状态监控和配置 */}
          <GridItem>
            <Box display="flex" flexDirection="column" gap={6}>
              <StatusPanel />
              <SerialConfigPanel />
            </Box>
          </GridItem>
        </Grid>
        {toaster.getToastsByPlacement('top')}
      </Box>
    </ApolloProvider>
  );
}

export default App;
