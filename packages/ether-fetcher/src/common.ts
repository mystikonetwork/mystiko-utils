import axios, { AxiosInstance, AxiosResponse } from 'axios';
import ethers from 'ethers';

export const DEFAULT_MAINNET_ETHER_API_BASE_URL = 'https://api.etherscan.io';

export const DEFAULT_MAINNET_BSC_API_BASE_URL = 'https://api.bscscan.com';

export const DEFAULT_MAINNET_POLYGON_API_BASE_URL = 'https://api.polygonscan.com';

export const DEFAULT_MAINNET_AVALANCHE_API_BASE_URL = 'https://api.snowtrace.io';

export const DEFAULT_MAINNET_FANTOM_API_BASE_URL = 'https://api.ftmscan.com';

export const DEFAULT_MAINNET_MOONBEAM_API_BASE_URL = 'https://api-moonbeam.moonscan.io';

export const DEFAULT_MAINNET_BASE_API_BASE_URL = 'https://api.basescan.org';

export const DEFAULT_MAINNET_ARBITRUM_ONE_API_BASE_URL = 'https://api.arbiscan.io';

export const DEFAULT_MAINNET_OPTIMISM_API_BASE_URL = 'https://api-optimistic.etherscan.io';

export const DEFAULT_TESTNET_GOERLI_API_BASE_URL = 'https://api-goerli.etherscan.io';

export const DEFAULT_TESTNET_BSC_API_BASE_URL = 'https://api-testnet.bscscan.com';

export const DEFAULT_TESTNET_POLYGAN_MUMBAI_API_BASE_URL = 'https://api-testnet.polygonscan.com';

export const DEFAULT_TESTNET_AVALANCHE_FUJI_API_BASE_URL = 'https://api-testnet.snowtrace.io';

export const DEFAULT_TESTNET_FANTOM_API_BASE_URL = 'https://api-testnet.ftmscan.com';

export const DEFAULT_TESTNET_MOONBASE_ALPHA_API_BASE_URL = 'https://api-moonbase.moonscan.io';

export const DEFAULT_TESTNET_BASE_GOERLI_API_BASE_URL = 'https://api-goerli.basescan.org';

export const DEFAULT_TESTNET_ARBITRUM_GOERLI_API_BASE_URL = 'https://api-goerli.arbiscan.io';

export const DEFAULT_TESTNET_OPTIMISM_GOERLI_API_BASE_URL = 'https://api-goerli-optimistic.etherscan.io';

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

export function getDefaultScanApiBaseUrl(chainId: number): string {
  switch (chainId) {
    case 1:
      return DEFAULT_MAINNET_ETHER_API_BASE_URL;
    case 56:
      return DEFAULT_MAINNET_BSC_API_BASE_URL;
    case 137:
      return DEFAULT_MAINNET_POLYGON_API_BASE_URL;
    case 43114:
      return DEFAULT_MAINNET_AVALANCHE_API_BASE_URL;
    case 250:
      return DEFAULT_MAINNET_FANTOM_API_BASE_URL;
    case 1284:
      return DEFAULT_MAINNET_MOONBEAM_API_BASE_URL;
    case 8453:
      return DEFAULT_MAINNET_BASE_API_BASE_URL;
    case 42161:
      return DEFAULT_MAINNET_ARBITRUM_ONE_API_BASE_URL;
    case 10:
      return DEFAULT_MAINNET_OPTIMISM_API_BASE_URL;
    case 5:
      return DEFAULT_TESTNET_GOERLI_API_BASE_URL;
    case 97:
      return DEFAULT_TESTNET_BSC_API_BASE_URL;
    case 80001:
      return DEFAULT_TESTNET_POLYGAN_MUMBAI_API_BASE_URL;
    case 43113:
      return DEFAULT_TESTNET_AVALANCHE_FUJI_API_BASE_URL;
    case 4002:
      return DEFAULT_TESTNET_FANTOM_API_BASE_URL;
    case 1287:
      return DEFAULT_TESTNET_MOONBASE_ALPHA_API_BASE_URL;
    case 84531:
      return DEFAULT_TESTNET_BASE_GOERLI_API_BASE_URL;
    case 421613:
      return DEFAULT_TESTNET_ARBITRUM_GOERLI_API_BASE_URL;
    case 420:
      return DEFAULT_TESTNET_OPTIMISM_GOERLI_API_BASE_URL;
    default:
      throw new Error(`Invalid chain id`);
  }
}

export function createAxiosInstance(baseUrl: string): AxiosInstance {
  const axiosInstance = axios.create({ baseURL: baseUrl });
  axiosInstance.interceptors.response.use(
    function (response: AxiosResponse) {
      const respData = response.data;
      if (!respData.status && respData.jsonrpc) {
        return Promise.resolve(respData.result);
      }
      if (respData.status === '1') {
        return Promise.resolve(respData.result);
      } else {
        if (respData.result instanceof Array) {
          return Promise.resolve(respData.result);
        } else {
          return Promise.reject(respData);
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

export async function httpGetEtherProxy(axios: AxiosInstance, paramsMap: Map<string, any>): Promise<any> {
  paramsMap.set('module', 'proxy');
  const queryString = wrapParamsQueryString(paramsMap);
  return axios.get(`/api?${queryString}`).then((resp) => {
    return resp;
  });
}

export function wrapParamsQueryString(paramsMap: Map<string, any>): string {
  const params: string[] = [];
  paramsMap.forEach((value, key) => {
    params.push(`${key}=${encodeURIComponent(value)}`);
  });
  return params.join('&');
}
