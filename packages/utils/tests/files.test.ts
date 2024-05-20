import fs from 'fs';
import path from 'path';
import os from 'os';
import pako from 'pako';
import { sha512 } from 'js-sha512';
import { readCompressedFile, readFile, readJsonFile } from '../src';

test('Test readFile', async () => {
  const data = await readFile('https://google.com');
  expect(data.length).toBeGreaterThan(0);
});

test('Test readCompressedFile', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utilsTest'));
  const uncompressedFile = path.join(os.tmpdir(), 'uncompressed.txt');
  const compressedFile = path.join(os.tmpdir(), 'compressed.gz');
  fs.writeFileSync(uncompressedFile, 'hello world');
  const compressedData = pako.deflate('hello world');
  fs.writeFileSync(compressedFile, compressedData);
  expect(
    (
      await readCompressedFile(uncompressedFile, undefined, undefined, undefined, sha512.hex('hello world'))
    ).toString(),
  ).toBe('hello world');
  expect(
    (
      await readCompressedFile(compressedFile, undefined, undefined, undefined, sha512.hex(compressedData))
    ).toString(),
  ).toBe('hello world');
  await expect(
    readCompressedFile(compressedFile, undefined, undefined, undefined, 'wrong checksum'),
  ).rejects.toThrow();
  fs.rmSync(tmpDir, { recursive: true });
});

test('Test readJsonFile', async () => {
  const data = await readJsonFile(['tests/files.non-exist.json', 'tests/files.test.json']);
  expect(data.test).toBe(true);
  await expect(
    readJsonFile(['tests/files.non-exist.json', 'tests/files.non-exist-1.json']),
  ).rejects.toThrow();
});
