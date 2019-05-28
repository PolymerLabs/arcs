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

import {AmlServiceContext} from './util.js';

export class LspLoader {
  context: AmlServiceContext;
  constructor(context: AmlServiceContext) {
    this.context = context;
  }

  path(fileName: string): string {
    return fileName.replace(/[/][^/]+$/, '/');
  }

  join(prefix: string, path: string): string {
    if (/^https?:\/\//.test(path)) {
      return path;
    }
    // TODO: replace this with something that isn't hacky
    if (path[0] === '/' || path[1] === ':') {
      return path;
    }
    prefix = this.path(prefix);
    path = this.normalizeDots(`${prefix}${path}`);
    return path;
  }

  // convert `././foo/bar/../baz` to `./foo/baz`
  normalizeDots(path: string): string {
    // only unix slashes
    path = path.replace(/\\/g, '/');
    // remove './'
    path = path.replace(/\/\.\//g, '/');
    // remove 'foo/..'
    const norm = s => s.replace(/(?:^|\/)[^./]*\/\.\./g, '');
    for (let n = norm(path); n !== path; path = n, n = norm(path));
    // remove '//' except after `:`
    path = path.replace(/([^:])(\/\/)/g, '$1/');
    return path;
  }

  async loadResource(fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, {encoding: 'utf-8'}, (err, data: string) => {
      this.context.logger.info(`Finished reading file ${fileName}`);
      if (err || !data) {
        this.context.logger.error(`Error reading file ${fileName}`);
        reject(err);
      }
      this.context.logger.info(`Success reading file ${fileName}`);
      resolve(data);
    });
  });
  }
}
