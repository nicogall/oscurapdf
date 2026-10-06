import type { LogEvent, Logger } from '../ports/logger';

/** Development logger. Prints only the event code and numeric fields. */
export class ConsoleLogger implements Logger {
  log({ code, ...numbers }: LogEvent): void {
    console.info('[redactor]', code, numbers);
  }
}
