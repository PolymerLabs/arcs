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
import minimist from 'minimist';
import {Schema} from '../runtime/schema.js';
import {Manifest} from '../runtime/manifest.js';
import {Dictionary} from '../runtime/hot.js';
import {Utils} from '../../shells/lib/utils.js';

export abstract class Schema2Base {
  constructor(readonly opts: minimist.ParsedArgs) {
    Utils.init('../..');
  }

  async call() {
    fs.mkdirSync(this.opts.outdir, {recursive: true});
    for (const file of this.opts._) {
      if (fs.existsSync(file)) {
        await this.processFile(file);
      } else {
        throw new Error(`File not found: ${file}`);
      }
    }
  }

  private async processFile(src: string) {
    const outName = this.opts.outfile || this.outputName(path.basename(src));
    const outPath = path.join(this.opts.outdir, outName);
    console.log(outPath);
    if (this.opts.update && fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs > fs.statSync(src).mtimeMs) {
      return;
    }

    const srcPath = `${process.cwd()}/${src}`;
    const manifest = await Utils.parse(`import '${srcPath}'`);
    const schemas = Schema2Base.collectSchemas(manifest);

    if (Object.keys(schemas).length === 0) {
      console.warn(`No schemas found in '${src}'`);
      return;
    }

    const outFile = fs.openSync(outPath, 'w');
    fs.writeSync(outFile, this.fileHeader(outName));
    for (const [name, schema] of Object.entries(schemas)) {
      fs.writeSync(outFile, this.entityClass(name, schema).replace(/ +\n/g, '\n'));
    }
    fs.writeSync(outFile, this.fileFooter());
    fs.closeSync(outFile);
  }

  /**
   * Collect declared schemas along with any inlined in particle connections.
   * Generated entities come from the  particle and connection name.
   * @param manifest Manifest expended by loader.
   * @return Dictionary<Schema> target schemas for code generation.
   */
  private static collectSchemas(manifest: Manifest): Dictionary<Schema> {
    const schemas: Dictionary<Schema> = {};
    for (const particle of manifest.allParticles) {
      for (const connection of particle.connections) {
        const schema = connection.type.getEntitySchema();
        const name = [particle.name, connection.name].filter((x) => !!x).join('_');
        schemas[name] = schema;
      }
    }
    return schemas;
  }

  protected processSchema(schema: Schema, processField: (field: string, typeChar: string) => void): number {
    let fieldCount = 0;
    for (const [field, descriptor] of Object.entries(schema.fields)) {
      fieldCount++;
      switch (this.typeSummary(descriptor)) {
        case 'schema-primitive:Text':
          processField(field, 'T');
          break;

        case 'schema-primitive:URL':
          processField(field, 'U');
          break;

        case 'schema-primitive:Number':
          processField(field, 'N');
          break;

        case 'schema-primitive:Boolean':
          processField(field, 'B');
          break;

        default:
          console.error(`Schema type for field '${field}' is not yet supported:`);
          console.dir(descriptor, {depth: null});
          process.exit(1);
      }
    }
    return fieldCount;
  }

  private typeSummary(descriptor) {
    switch (descriptor.kind) {
      case 'schema-primitive':
        return `schema-primitive:${descriptor.type}`;

      case 'schema-collection':
        return `schema-collection:${descriptor.schema.type}`;

      default:
        return descriptor.kind;
    }
  }

  abstract outputName(baseName: string): string;
  abstract fileHeader(outName: string): string;
  abstract fileFooter(): string;
  abstract entityClass(name: string, schema: Schema): string;
}
