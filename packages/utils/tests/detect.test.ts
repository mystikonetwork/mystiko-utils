import nock from 'nock';
import { DEFAULT_IP_API, detectConcurrency, detectCountryCode } from '../src';

test('test detectCountryCode', async () => {
  nock(DEFAULT_IP_API).get('/').reply(200, { country_code: 'CN' });
  const country = await detectCountryCode();
  expect(country).toBe('CN');
});

test('test detectCountryCode raise error', async () => {
  nock(DEFAULT_IP_API).get('/').reply(500, {});
  await expect(detectCountryCode()).rejects.toThrow();
});

test('test detectCountryCode different api', async () => {
  const url = 'https://ipinfo.io';
  nock(url).get('/').reply(200, { country_code: 'CN' });
  const country = await detectCountryCode(url);
  expect(country).toBe('CN');
});

test('test detectConcurrency', () => {
  expect(detectConcurrency()).not.toBe(undefined);
});
