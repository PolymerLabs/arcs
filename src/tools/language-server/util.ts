/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import url from 'url';
import fs from 'fs';

export interface LanguageServiceOptions {
  log: string;       // The logging service to use ('console', 'null', or a file path).
  port: number;      // The port number to use for tcp/ip communication.
  help: boolean;     // Print the help information and do not run the server.
  version: boolean;  // Print the version information and do not run the server.
  stdio: boolean;    // Use stdio (rather than a tcp/ip port).
}

export interface LanguageServiceContext {
}

// tslint:disable: no-any
export interface Logger {
  log(...values: any[]): void;
  info(...values: any[]): void;
  warn(...values: any[]): void;
  error(...values: any[]): void;
}

// tslint:disable: no-any
export class DevNullLogger implements Logger {
  public log(..._values: any[]): void {}
  public info(..._values: any[]): void {}
  public warn(..._values: any[]): void {}
  public error(..._values: any[]): void {}
}

// tslint:disable: no-any
export class FileLogger implements Logger {
  path: string;

  constructor(path: string) {
    this.path = path;
  }

  private write(level: string, values: any[]): void {
    const str = (val: any) => {
      if (val instanceof Object) {
        return JSON.stringify(val, null, 2);
      }
      if (val.toString) {
        return val.toString();
      }
      return val;
    };
    const msg = values.map(str).join(' ');
    fs.appendFileSync(this.path, `${level}: ${msg}\n`);
  }

  public log(...values: any[]): void {
    this.write('LOG', values);
  }
  public info(...values: any[]): void {
    this.write('INFO', values);
  }
  public warn(...values: any[]): void {
    this.write('WARN', values);
  }
  public error(...values: any[]): void {
    this.write('ERROR', values);
  }
}

export function normalizeUri(uri: string): string {
  const parts = url.parse(uri);
  if (!parts.pathname) {
    return uri;
  }
  const pathParts = parts.pathname.split('/').map(
      segment => encodeURIComponent(decodeURIComponent(segment)));
  // Decode Windows drive letter colon
  if (/^[a-z]%3A$/i.test(pathParts[1])) {
    pathParts[1] = decodeURIComponent(pathParts[1]);
  }
  parts.pathname = pathParts.join('/');
  return url.format(parts);
}

export function uri2path(uri: string): string|undefined {
  if (!uri) {
    return undefined;
  }
  const parts = url.parse(uri);
  if (parts.protocol !== 'file:') {
    throw new Error('Cannot resolve non-file uri to path: ' + uri);
  }

  let filePath = parts.pathname || '';

  // If the path starts with a drive letter, return a Windows path
  if (/^\/[a-z]:\//i.test(filePath)) {
    filePath = filePath.substr(1).replace(/\//g, '\\');
  }

  return decodeURIComponent(filePath);
}

export function camelCase(str: string): string {
  return str.replace(/\/(.?)/g, (_, s) => s.toUpperCase());
}
