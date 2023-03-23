import axios from 'axios';

export const DEFAULT_IP_API = 'https://ipwho.is';

export function detectCountryCode(api?: string): Promise<string | undefined> {
  const apiUrl = api || DEFAULT_IP_API;
  return axios.get(apiUrl).then((resp) => resp.data.country_code);
}
