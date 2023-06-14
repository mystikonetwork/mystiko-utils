import { LogLevelDesc } from 'loglevel';
import { logger as rootLogger } from '@mystikonetwork/utils';

export interface RetryPolicy {
  isRetryable(error: any, currentRetryTime: number): boolean;
}

export class DefaultRetryPolicy implements RetryPolicy {
  private readonly maxRetryTimes: number;
  private logger = rootLogger.getLogger('DefaultRetryPolicy');

  constructor(maxRetryTimes = 5, logLevel: LogLevelDesc = 'info') {
    this.maxRetryTimes = maxRetryTimes;
    this.logger.setLevel(logLevel);
  }

  isRetryable(error: any, currentRetryTime: number): boolean {
    if (currentRetryTime >= this.maxRetryTimes) {
      this.logger.debug(
        `current retry times exceed max retry times, will not try again, error: ${JSON.stringify(error)}.`,
      );
      return false;
    }
    if (error && String(error.result).toLowerCase().search('rate limit') !== -1) {
      return true;
    }
    this.logger.debug(`an unretryable error was caught : ${JSON.stringify(error)}.`);
    return false;
  }
}
