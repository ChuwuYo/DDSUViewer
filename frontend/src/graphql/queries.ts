import { gql } from '@apollo/client';

export const GET_ELECTRICAL_DATA = gql`
  query GetElectricalData {
    electricalData {
      voltage
      current
      activePower
      reactivePower
      apparentPower
      powerFactor
      frequency
      activeEnergy
      timestamp
    }
  }
`;

export const GET_DEVICE_STATUS = gql`
  query GetDeviceStatus {
    deviceStatus {
      connected
      protocol
      lastUpdate
      errorMessage
    }
  }
`;

export const GET_SERIAL_CONFIG = gql`
  query GetSerialConfig {
    serialConfig {
      port
      baudRate
      dataBits
      stopBits
      parity
      slaveID
    }
  }
`;

export const GET_AVAILABLE_PORTS = gql`
  query GetAvailablePorts {
    availablePorts
  }
`;