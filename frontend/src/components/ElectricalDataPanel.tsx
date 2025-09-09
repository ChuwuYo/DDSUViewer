import { Box, Card, SimpleGrid, Text, Badge, Flex } from '@chakra-ui/react';
import { useAppStore } from '../hooks/usePolling';
import { mdColors, dataColors } from '../theme/colors';

const DataCard = ({ title, value, unit, color = 'blue' }: {
  title: string;
  value?: number;
  unit: string;
  color?: string;
}) => (
  <Card.Root 
    bg={mdColors.cardBackground} 
    shadow="md" 
    borderRadius="xl" 
    border="1px" 
    borderColor={mdColors.outlineVariant}
    _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
    transition="all 0.2s"
  >
    <Card.Body p={6}>
      <Text fontSize="sm" color={mdColors.onSurfaceVariant} mb={2} fontWeight="medium">{title}</Text>
      <Text fontSize="3xl" fontWeight="bold" color={value !== undefined ? dataColors[color as keyof typeof dataColors] : mdColors.outline} mb={1}>
        {value !== undefined ? value.toFixed(3) : '未知'}
      </Text>
      <Text fontSize="sm" color={mdColors.onSurfaceVariant} fontWeight="medium">{unit}</Text>
    </Card.Body>
  </Card.Root>
);

export const ElectricalDataPanel = () => {
  const { data: electricalData } = useAppStore();

  return (
    <Box bg={mdColors.surface} borderRadius="xl" shadow="md" p={6} border="1px" borderColor={mdColors.outlineVariant}>
      <Flex mb={6} align="center" justify="space-between">
        <Text fontSize="xl" fontWeight="bold" color={mdColors.onSurface}>实时电参量数据</Text>
        <Badge bg={mdColors.secondaryContainer} color={mdColors.onSecondaryContainer} px={3} py={1} borderRadius="full">
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
      
      <Box mt={6} pt={4} borderTop="1px" borderColor={mdColors.outlineVariant}>
        <Text fontSize="sm" color={mdColors.onSurfaceVariant} textAlign="center">
          最后更新: {electricalData?.timestamp ? new Date(electricalData.timestamp).toLocaleString() : '无'}
        </Text>
      </Box>
    </Box>
  );
};