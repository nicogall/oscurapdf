import type { LogEvent, Logger } from '../ports/logger';

/** Production logger: drops every event. */
export class NullLogger implements Logger {
  log(_event: LogEvent): void {
    // Intentionally empty: production builds keep no logs.
  }
}
