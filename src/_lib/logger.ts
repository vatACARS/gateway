import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class Logger extends ConsoleLogger {
  private static logFilePath: string;

  constructor(context?: string) {
    super(context);

    // Initialize the log file path only once
    if (!Logger.logFilePath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFileName = `application-${timestamp}.log`;

      // Set the log file path (e.g., in the logs directory)
      Logger.logFilePath = path.join(__dirname, 'logs', logFileName);

      // Ensure the logs directory exists
      const logsDir = path.dirname(Logger.logFilePath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    }
  }

  private writeToFile(message: string) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;

    // Append the log message to the file
    fs.appendFileSync(Logger.logFilePath, formattedMessage, {
      encoding: 'utf8',
    });
  }

  log(message: string, context?: string) {
    super.log(message, context);
    this.writeToFile(`LOG: ${message}`);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.writeToFile(`ERROR: ${message} ${trace ? '\nTrace: ' + trace : ''}`);
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
    this.writeToFile(`WARN: ${message}`);
  }

  debug(message: string, context?: string) {
    super.debug(message, context);
    this.writeToFile(`DEBUG: ${message}`);
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
    this.writeToFile(`VERBOSE: ${message}`);
  }
}
