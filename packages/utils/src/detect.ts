import axios from 'axios';

export const DEFAULT_IP_API = 'https://ipwho.is';

export function detectCountryCode(api?: string): Promise<string | undefined> {
  const apiUrl = api || DEFAULT_IP_API;
  return axios.get(apiUrl).then((resp) => resp.data.country_code);
}

export function detectConcurrency(): number | undefined {
  if (typeof window !== 'undefined' && window.navigator && 'hardwareConcurrency' in window.navigator) {
    return window.navigator.hardwareConcurrency;
  }
  if (typeof process !== 'undefined') {
    // eslint-disable-next-line global-require
    const os = require('os') as typeof import('os'); // Dynamically require 'os' only in a Node.js environment
    return os.cpus().length;
  }
  return undefined;
}
