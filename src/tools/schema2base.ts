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
import minimist from 'minimist';
import path from 'path';
import {Manifest} from '../runtime/manifest.js';


export function typeSummary(descriptor) {
  switch (descriptor.kind) {
    case 'schema-primitive':
      return `schema-primitive:${descriptor.type}`;

    case 'schema-collection':
      return `schema-collection:${descriptor.schema.type}`;

    default:
      return descriptor.kind;
  }
}


export class Schema2Base {
  private desc: string;
  private fileNamer: (schemaName: string) => string;
  private generate: (name: string, schema) => string;

  constructor(description: string, fileNamer: (schemaName: string) => string, generator: (name: string, schema) => string) {
    this.desc = description;
    this.fileNamer = fileNamer;
    this.generate = generator;
  }


  // TODO: handle schemas with multiple names and schemas with parents
  // TODO: error handling
  async processFile(file: string, outputPrefix: string = ''): Promise<void> {
    const contents = fs.readFileSync(file, 'utf-8');
    const manifest = await Manifest.parse(contents);
    for (const schema of Object.values(manifest.schemas)) {
      const outFile = this.fileNamer(schema.names[0]);
      const contents = this.generate(schema.names[0], schema);
      fs.writeFileSync(outputPrefix + outFile, contents);
    }
  }

  get scriptName() {
    return path.basename(__filename).split('.')[0];
  }

  call() {
    // TODO: options: output dir, filter specific schema(s)
    const argv = minimist(process.argv.slice(2), {
      boolean: ['help'],
    });

    if (argv.help || argv._.length === 0) {
      console.log(`
Usage
  $ tools/sigh ${this.scriptName} [file ...]

Description
  ${this.desc} 
`);
      process.exit();
    }

    for (const file of argv._) {
      void this.processFile(file);
    }
  }
}

