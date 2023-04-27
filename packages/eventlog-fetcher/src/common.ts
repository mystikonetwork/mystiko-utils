import axios, { AxiosInstance, AxiosResponse } from 'axios';
import ethers from 'ethers';

export const MAINNET_ETHER_API_BASE_URL = 'https://api.etherscan.io';

export const MAINNET_BSC_API_BASE_URL = 'https://api.bscscan.com';

export const TESTNET_GOERLI_API_BASE_URL = 'https://api-goerli.etherscan.io';

export const TESTNET_BSC_API_BASE_URL = 'https://api-testnet.bscscan.com';

export const TESTNET_POLYGAN_MUMBAI_API_BASE_URL = 'https://api-testnet.polygonscan.com';

export const TESTNET_AVALANCHE_FUJI_API_BASE_URL = 'https://api.snowtrace.io';

export const TESTNET_FANTOM_API_BASE_URL = 'https://api-testnet.ftmscan.com';

export const TESTNET_MOONBASE_ALPHA_API_BASE_URL = 'https://api-moonbase.moonscan.io';

export interface ScanApiEventLogParams {
  module: string;
  action: string;
  address: string;
  fromBlock: number;
  toBlock: number;
  topic0?: string;
  page: number;
  offset: number;
  apikey: string;
}

export function getScanApiBaseUrlByChainId(chainId: number): string {
  switch (chainId) {
    case 1:
      return MAINNET_ETHER_API_BASE_URL;
    case 56:
      return MAINNET_BSC_API_BASE_URL;
    case 5:
      return TESTNET_GOERLI_API_BASE_URL;
    case 97:
      return TESTNET_BSC_API_BASE_URL;
    case 80001:
      return TESTNET_POLYGAN_MUMBAI_API_BASE_URL;
    case 43113:
      return TESTNET_AVALANCHE_FUJI_API_BASE_URL;
    case 4002:
      return TESTNET_FANTOM_API_BASE_URL;
    case 1287:
      return TESTNET_MOONBASE_ALPHA_API_BASE_URL;
    default:
      throw new Error(`Invalid chain id`);
  }
}

export function createAxiosInstance(baseUrl: string): AxiosInstance {
  const axiosInstance = axios.create({ baseURL: baseUrl });
  axiosInstance.interceptors.response.use(
    function (response: AxiosResponse) {
      if (!response || response.status != 200) {
        return Promise.reject(`Scan api request exception, data: ${JSON.stringify(response)}`);
      }
      if (response.data.status === '1') {
        return Promise.resolve(response.data.result);
      } else {
        if (response.data.result instanceof Array) {
          return Promise.resolve(response.data.result);
        } else {
          return Promise.reject(`Scan api response exception, data: ${JSON.stringify(response.data)}`);
        }
      }
    },
    function (error) {
      return Promise.reject(error);
    },
  );
  return axiosInstance;
}

export function wrapRequestParams(
  address: string,
  fromBlock: number,
  toBlock: number,
  page: number,
  offset: number,
  apikey: string,
  topic0?: string,
): ScanApiEventLogParams {
  return {
    module: 'logs',
    action: 'getLogs',
    address,
    fromBlock,
    toBlock,
    topic0,
    page,
    offset,
    apikey,
  };
}

export async function httpGetFetchEventLogs(
  axios: AxiosInstance,
  params: ScanApiEventLogParams,
): Promise<ethers.providers.Log[]> {
  return axios.get<any, ethers.providers.Log[]>('/api', { params }).then((events: ethers.providers.Log[]) => {
    return events;
  });
}
