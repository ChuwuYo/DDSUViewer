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