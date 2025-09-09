import { gql } from '@apollo/client';

export const UPDATE_SERIAL_CONFIG = gql`
  mutation UpdateSerialConfig($input: SerialConfigInput!) {
    updateSerialConfig(input: $input)
  }
`;

export const START_POLLING = gql`
  mutation StartPolling {
    startPolling
  }
`;

export const STOP_POLLING = gql`
  mutation StopPolling {
    stopPolling
  }
`;

export const OPEN_SERIAL = gql`
  mutation OpenSerial {
    openSerial
  }
`;

export const CLOSE_SERIAL = gql`
  mutation CloseSerial {
    closeSerial
  }
`;