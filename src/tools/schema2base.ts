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
import {Dictionary} from '../runtime/hot.js';
import {Utils} from '../../shells/lib/utils.js';
import {Manifest} from '../runtime/manifest.js';

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

  /** Collect declared schemas along with any inlined in particle connections. */
  private collectSchemas(manifest: Manifest): Dictionary<Schema> {
    const schemas: Dictionary<Schema> = {};
    manifest.allSchemas.forEach(schema => {
      const name = schema && schema.names && schema.names[0] || this.nameAnonymousSchema(schema);
      schemas[name] = schema;
    });
    for (const particle of manifest.allParticles) {
      for (const connection of particle.connections) {
        const schema = connection.type.getEntitySchema();
        if (!schema) {
          continue;
        }
        if (schema.names.length === 0) {
          const name = this.nameAnonymousSchema(schema);
          if (!(name in schemas)) {
            schemas[name] = schema;
          }
        }
        for (const name of schema.names) {
          if (!(name in schemas)) {
            schemas[name] = schema;
          }
        }
      }
    }
    return schemas;
  }


  /**
   * Collect inline schema fields. These will be output first so they're defined
   * prior to use in their containing entity classes.
   */
  private collectInlineSchemas(schemas: Dictionary<Schema>): Dictionary<Schema> {
    const inlineSchemas: Dictionary<Schema> = {};
    for (const schema of Object.values(schemas)) {
      for (const [field, descriptor] of Object.entries(schema.fields)) {
        if (descriptor.kind === 'schema-reference' && descriptor.schema.kind === 'schema-inline') {
          const name = this.inlineSchemaName(field, descriptor);
          if (!(name in inlineSchemas)) {
            inlineSchemas[name] = descriptor.schema.model.getEntitySchema();
          }
        }
      }
    }

    return inlineSchemas;
  }

  /** Quick-and-dirty name mangling for anonymous schemas. TODO(alxr): suggestions welcome */
  private nameAnonymousSchema(schema: Schema): string {
    const fieldStrings = Object.entries(schema.fields)
      .map(([name, field]) => Schema._typeString(field) + name)
      .sort((a, b) => a.localeCompare(b))  // TODO(alxr): Does field order matter?
      .map(ts => {
        return ts
          .replace('(', '__')       // Unions  --> __fieldorfieldorfield
          .replace(',', '_')        // Tuples --> __field_field_filed
          .replace(/[.,/#!$%^&*;:{}<>=\-`~()\s]/g, ''); // Remove punctuation (except `_`).
      });

    return ['Anon', ...fieldStrings].join('');
  }

  private async processFile(src: string) {
    const outName = this.opts.outfile || this.outputName(path.basename(src));
    const outPath = path.join(this.opts.outdir, outName);
    console.log(outPath);
    if (this.opts.update && fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs > fs.statSync(src).mtimeMs) {
      return;
    }

    const manifest = await Utils.parse(`import '${src}'`);

    const schemas = this.collectSchemas(manifest);

    if (Object.keys(schemas).length === 0) {
      console.warn(`No schemas found in '${src}'`);
      return;
    }

    const inlineSchemas = this.collectInlineSchemas(schemas);

    const outFile = fs.openSync(outPath, 'w');
    fs.writeSync(outFile, this.fileHeader(outName));
    for (const dict of [inlineSchemas, schemas]) {
      for (const [name, schema] of Object.entries(dict)) {
        fs.writeSync(outFile, this.entityClass(name, schema).replace(/ +\n/g, '\n'));
      }
    }
    fs.writeSync(outFile, this.fileFooter());
    fs.closeSync(outFile);
  }

  protected processSchema(schema: Schema,
      processField: (field: string, typeChar: string, refName: string) => void): number {
    let fieldCount = 0;
    for (const [field, descriptor] of Object.entries(schema.fields)) {
      fieldCount++;
      switch (this.typeSummary(descriptor)) {
        case 'schema-primitive:Text':
          processField(field, 'T', null);
          break;

        case 'schema-primitive:URL':
          processField(field, 'U', null);
          break;

        case 'schema-primitive:Number':
          processField(field, 'N', null);
          break;

        case 'schema-primitive:Boolean':
          processField(field, 'B', null);
          break;

        case 'schema-reference':
          processField(field, 'R', this.inlineSchemaName(field, descriptor));
          break;

        default:
          console.log(`Schema type for field '${field}' is not yet supported:`);
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

  private inlineSchemaName(field, descriptor) {
    let name = descriptor.schema.name;
    if (!name && descriptor.schema.names && descriptor.schema.names.length > 0) {
      name = descriptor.schema.names[0];
    }
    if (!name) {
      console.log(`Unnamed inline schemas (field '${field}') are not yet supported`);
      process.exit(1);
    }
    return name;
  }

  abstract outputName(baseName: string): string;
  abstract fileHeader(outName: string): string;
  abstract fileFooter(): string;
  abstract entityClass(name: string, schema: Schema): string;
}
