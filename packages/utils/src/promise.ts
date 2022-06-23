export class TimeoutError extends Error {}

export function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timer | undefined;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  }).then(() => Promise.reject(new TimeoutError(`timeout after ${timeoutMs} ms`)));
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  });
}
