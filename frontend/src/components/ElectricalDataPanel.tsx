import { useQuery } from '@apollo/client/react';
import { Box, Card, SimpleGrid, Text, Badge, Spinner, Flex } from '@chakra-ui/react';
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
  value?: number;
  unit: string;
  color?: string;
}) => (
  <Card 
    bg="white" 
    shadow="md" 
    borderRadius="xl" 
    border="1px" 
    borderColor="gray.200"
    _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
    transition="all 0.2s"
  >
    <CardBody p={6}>
      <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">{title}</Text>
      <Text fontSize="3xl" fontWeight="bold" color={value !== undefined ? `${color}.500` : 'gray.400'} mb={1}>
        {value !== undefined ? value.toFixed(3) : '未知'}
      </Text>
      <Text fontSize="sm" color="gray.500" fontWeight="medium">{unit}</Text>
    </CardBody>
  </Card>
);

export const ElectricalDataPanel = () => {
  const { data, loading, error } = useQuery<{ electricalData: ElectricalData }>(
    GET_ELECTRICAL_DATA,
    { 
      pollInterval: 1000,
      notifyOnNetworkStatusChange: false,
      errorPolicy: 'ignore'
    }
  );

  if (loading && !data) return <Spinner size="lg" />;
  if (error && !data) return <Text color="red.500">数据加载失败: {error.message}</Text>;

  const electricalData = data?.electricalData;

  return (
    <Box bg="white" borderRadius="xl" shadow="md" p={6}>
      <Flex mb={6} align="center" justify="space-between">
        <Text fontSize="xl" fontWeight="bold" color="gray.800">实时电参量数据</Text>
        <Badge colorScheme="green" variant="solid" px={3} py={1} borderRadius="full">
          实时更新
        </Badge>
      </Flex>
      
      <SimpleGrid columns={{ base: 2, lg: 4 }} gap={6}>
        <DataCard 
          title="电压" 
          value={electricalData?.voltage} 
          unit="V" 
          color="blue" 
        />
        <DataCard 
          title="电流" 
          value={electricalData?.current} 
          unit="A" 
          color="orange" 
        />
        <DataCard 
          title="有功功率" 
          value={electricalData?.activePower} 
          unit="W" 
          color="green" 
        />
        <DataCard 
          title="无功功率" 
          value={electricalData?.reactivePower} 
          unit="Var" 
          color="purple" 
        />
        <DataCard 
          title="视在功率" 
          value={electricalData?.apparentPower} 
          unit="VA" 
          color="teal" 
        />
        <DataCard 
          title="功率因数" 
          value={electricalData?.powerFactor} 
          unit="" 
          color="cyan" 
        />
        <DataCard 
          title="频率" 
          value={electricalData?.frequency} 
          unit="Hz" 
          color="pink" 
        />
        <DataCard 
          title="有功总电能" 
          value={electricalData?.activeEnergy} 
          unit="kWh" 
          color="red" 
        />
      </SimpleGrid>
      
      <Box mt={6} pt={4} borderTop="1px" borderColor="gray.200">
        <Text fontSize="sm" color="gray.500" textAlign="center">
          最后更新: {electricalData?.timestamp ? new Date(electricalData.timestamp).toLocaleString() : '无'}
        </Text>
      </Box>
    </Box>
  );
};