import { useQuery } from '@apollo/client';
import { Box, Card, SimpleGrid, Text, Badge, Spinner } from '@chakra-ui/react';
import { GET_ELECTRICAL_DATA } from '../graphql/queries';
import { showErrorToast } from './ErrorToast';

interface ElectricalData {
  voltage: number;
  current: number;
  activePower: number;
  reactivePower: number;
  apparentPower: number;
  powerFactor: number;
  frequency: number;
  activeEnergy: number;
  timestamp: string;
}

const DataCard = ({ title, value, unit, color = 'blue' }: {
  title: string;
  value: number;
  unit: string;
  color?: string;
}) => (
  <Card.Root>
    <Card.Body>
      <Text fontSize="sm" color="gray.600" mb={1}>{title}</Text>
      <Text fontSize="2xl" fontWeight="bold" color={`${color}.500`}>
        {value.toFixed(3)}
      </Text>
      <Text fontSize="sm" color="gray.500">{unit}</Text>
    </Card.Body>
  </Card.Root>
);

export const ElectricalDataPanel = () => {
  const { data, loading, error } = useQuery<{ electricalData: ElectricalData }>(
    GET_ELECTRICAL_DATA,
    { 
      pollInterval: 1000,
      onError: (error) => {
        showErrorToast('数据异常', `无法获取电参量数据: ${error.message}`);
      }
    }
  );

  if (loading) return <Spinner size="lg" />;
  if (error) return <Text color="red.500">数据加载失败: {error.message}</Text>;

  const electricalData = data?.electricalData;
  if (!electricalData) return <Text>暂无数据</Text>;

  return (
    <Box>
      <Box mb={4} display="flex" alignItems="center" gap={2}>
        <Text fontSize="lg" fontWeight="semibold">实时电参量数据</Text>
        <Badge colorScheme="green">在线</Badge>
      </Box>
      
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <DataCard 
          title="电压" 
          value={electricalData.voltage} 
          unit="V" 
          color="blue" 
        />
        <DataCard 
          title="电流" 
          value={electricalData.current} 
          unit="A" 
          color="orange" 
        />
        <DataCard 
          title="有功功率" 
          value={electricalData.activePower} 
          unit="W" 
          color="green" 
        />
        <DataCard 
          title="无功功率" 
          value={electricalData.reactivePower} 
          unit="Var" 
          color="purple" 
        />
        <DataCard 
          title="视在功率" 
          value={electricalData.apparentPower} 
          unit="VA" 
          color="teal" 
        />
        <DataCard 
          title="功率因数" 
          value={electricalData.powerFactor} 
          unit="" 
          color="cyan" 
        />
        <DataCard 
          title="频率" 
          value={electricalData.frequency} 
          unit="Hz" 
          color="pink" 
        />
        <DataCard 
          title="有功总电能" 
          value={electricalData.activeEnergy} 
          unit="kWh" 
          color="red" 
        />
      </SimpleGrid>
      
      <Text fontSize="xs" color="gray.500" mt={4}>
        最后更新: {new Date(electricalData.timestamp).toLocaleString()}
      </Text>
    </Box>
  );
};