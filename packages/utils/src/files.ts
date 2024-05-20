import axios from 'axios';
import pako from 'pako';
import * as fastfile from '@mystikonetwork/fastfile';
import { sha512 } from 'js-sha512';
import { check } from './check';

function validateChecksum(data: Buffer, checksum?: string): Promise<Buffer> {
  if (checksum) {
    const calculatedChecksum = sha512.hex(data);
    if (checksum !== calculatedChecksum) {
      return Promise.reject(
        new Error(`checksum mismatch expected=${checksum} vs actual=${calculatedChecksum}`),
      );
    }
  }
  return Promise.resolve(data);
}

async function readRawFile(
  path: string,
  cacheSize?: number,
  pageSize?: number,
  downloadEventListener?: (progressEvent: any) => void,
  checksum?: string,
): Promise<Buffer> {
  if (path.startsWith('http') || path.startsWith('https')) {
    const resp = await axios.get(path, {
      responseType: 'arraybuffer',
      onDownloadProgress: downloadEventListener,
    });
    return validateChecksum(Buffer.from(resp.data), checksum);
  }
  return fastfile.readExisting(path, cacheSize, pageSize).then((fd: any) =>
    fd.read(fd.totalSize).then((data: any) => {
      fd.close();
      return validateChecksum(Buffer.from(data), checksum);
    }),
  );
}

async function readFileRecursively(
  possiblePaths: string[],
  index: number,
  cacheSize?: number,
  pageSize?: number,
  isCompressed?: (path: string) => boolean,
  downloadEventListener?: (progressEvent: any) => void,
  checksum?: string,
): Promise<Buffer> {
  const path = possiblePaths[index];
  const data = await readRawFile(path, cacheSize, pageSize, downloadEventListener, checksum).catch(
    (error: any) => {
      if (possiblePaths.length > index + 1) {
        return readFileRecursively(
          possiblePaths,
          index + 1,
          cacheSize,
          pageSize,
          isCompressed,
          downloadEventListener,
        );
      }
      return Promise.reject(error);
    },
  );
  if (isCompressed && isCompressed(path)) {
    return Buffer.from(pako.inflate(data));
  }
  return data;
}

/**
 * @function module:mystiko/utils.readFile
 * @desc read a file's whole content with given path.
 * @param {string|string[]} path file's path, it could be a URL or a file system path.
 * @param {number|undefined} [cacheSize] cache size for this file.
 * @param {number|undefined} [pageSize] page size for this file.
 * @param {function} [isCompressed] function to check whether the file is a compressed file.
 * @param {function} [downloadEventListener] function to listen download event.
 * @param {string} [checksum] checksum of the file.
 * @returns {Promise<Buffer>} check {@link https://nodejs.org/api/buffer.html Node.js Buffer}
 */
export function readFile(
  path: string | string[],
  cacheSize?: number,
  pageSize?: number,
  isCompressed?: (path: string) => boolean,
  downloadEventListener?: (progressEvent: any) => void,
  checksum?: string,
): Promise<Buffer> {
  const possiblePaths = path instanceof Array ? path : [path];
  check(possiblePaths.length > 0, 'path cannot be empty');
  return readFileRecursively(
    possiblePaths,
    0,
    cacheSize,
    pageSize,
    isCompressed,
    downloadEventListener,
    checksum,
  );
}

/**
 * @function module:mystiko/utils.readCompressedFile
 * @desc read file with gz extension and decompress it. If the path is not ended with gz, it returns original file.
 * @param {string|string[]} path file's path, it could be a URL or a file system path.
 * @param {number|undefined} [cacheSize] cache size for this file.
 * @param {number|undefined} [pageSize] page size for this file.
 * @param {function} [downloadEventListener] function to listen download event.
 * @param {string} [checksum] checksum of the file.
 * @returns {Object} decompressed file if the path is ended with gz, otherwise it returns original file.
 */
export function readCompressedFile(
  path: string | string[],
  cacheSize?: number,
  pageSize?: number,
  downloadEventListener?: (progressEvent: any) => void,
  checksum?: string,
): Promise<Buffer> {
  return readFile(path, cacheSize, pageSize, (p) => p.endsWith('.gz'), downloadEventListener, checksum);
}

/**
 * @function module:mystiko/utils.readJsonFile
 * @desc read a file's whole content with given path, and parse it as JSON.
 * @param {string|string[]} path file's path, it could be a URL or a file system path.
 * @param {number|undefined} [cacheSize] cache size for this file.
 * @param {number|undefined} [pageSize] page size for this file.
 * @param {function} [downloadEventListener] function to listen download event.
 * @param {string} [checksum] checksum of the file.
 * @returns {Object} parsed JSON object.
 */
export async function readJsonFile(
  path: string | string[],
  cacheSize?: number,
  pageSize?: number,
  downloadEventListener?: (progressEvent: any) => void,
  checksum?: string,
): Promise<any> {
  const data = await readCompressedFile(path, cacheSize, pageSize, downloadEventListener, checksum);
  return JSON.parse(data.toString());
}
