import type { Logger } from '../ports/logger';
import { ConsoleLogger } from './console-logger';
import { NullLogger } from './null-logger';

export const createLogger = (isProduction: boolean): Logger => (isProduction ? new NullLogger() : new ConsoleLogger());
