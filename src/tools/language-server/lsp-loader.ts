/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import fs from 'fs';
import path from 'path';

import {Logger} from './util.js';
import {Loader} from '../../platform/loader.js';

export class LspLoader extends Loader {
  logger: Logger;
  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  path(fileName: string): string {
    return fileName.replace(/[/][^/]+$/, '/');
  }

  join(prefix: string, filepath: string): string {
    if (/^https?:\/\//.test(filepath)) {
      return filepath;
    }
    // TODO: replace this with something that isn't hacky
    if (filepath[0] === '/' || filepath[1] === ':') {
      return filepath;
    }
    return path.join( path.normalize(prefix), filepath);
  }

  async loadResource(fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, {encoding: 'utf-8'}, (err, data: string) => {
      this.logger.info(`Finished reading file ${fileName}`);
      if (err || !data) {
        this.logger.error(`Error reading file ${fileName}`);
        reject(err);
      }
      this.logger.info(`Success reading file ${fileName}`);
      resolve(data);
    });
  });
  }
}
