/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Loader} from '../../platform/loader.js';
import {parse as parser} from '../../gen/runtime/manifest-parser.js';

import * as AstNode from '../manifest-ast-types/manifest-ast-nodes.js';
import {Dictionary} from '../../utils/lib-utils.js';

export type Ast = AstNode.All[];

interface ManifestLoadOptions {
  registry?: Dictionary<Promise<Ast>>;
  errors?: [];
}

export interface ManifestParseOptions extends ManifestLoadOptions {
  filename?: string;
  loader?: Loader;
  //throwImportErrors?: boolean;
}

export enum ErrorSeverity {
  Error = 'error',
  Warning = 'warning'
}

export class ManifestError extends Error {
  key: string;
  location: AstNode.SourceLocation;
  severity = ErrorSeverity.Error;
  constructor(location: AstNode.SourceLocation, message: string) {
    super(message);
    this.location = location;
  }
}

export class ManifestWarning extends ManifestError {
  severity = ErrorSeverity.Warning;
  // constructor(location: AstNode.SourceLocation, message: string) {
  //   super(location, message);
  //   this.severity = ErrorSeverity.Warning;
  // }
}

export class ManifestParser {
  static async load(path: string, loader: Loader, options: ManifestLoadOptions = {}): Promise<Ast> {
    if (!loader) {
      throw new Error('loader is required to load manifest for parsing');
    }
    // TODO(sjmiles):
    // (1) IMO caching should be done at the Loader level
    // (2) unless 'path' is normalized, it's not necessarily a key (could be more one path to the same file)
    const {registry} = options;
    if (registry && registry[path]) {
      return await registry[path];
    }
    const errors = options.errors || [];
    const content = await loader.loadResource(path);
    const promise = this.parse(content, {...options, filename: path, loader, errors});
    if (registry) {
      registry[path] = promise;
    }
    return await promise;
  }
  static async parse(content: string, options: ManifestParseOptions = {}): Promise<Ast> {
    const {filename, loader, registry, errors} = options;
    let items: Ast = [];
    try {
      items = parser(content, {filename}) as Ast;
    } catch (e) {
      console.error('uhps');
      throw e;
      //throw processError(e, true);
    }
    //console.log(items.length);
    await this.parseImports(filename, loader, items, registry, errors || []);
    return items;
  }
  static extract(kind: string, fromAst: Ast) {
    let results = [];
    fromAst.forEach(item => {
      switch (item.kind) {
        case kind:
          results.push(item);
          break;
        case 'import':
          if (item['items']) {
            // include members from import.items sub-ast
            results = results.concat(this.extract(kind, item['items']));
          }
          break;
        default:
          break;
      }
    });
    return results;
  }
  protected static async parseImports(root, loader: Loader, items, registry, errors) {
    // TODO(sjmiles): not `typeof AstNode.Import`?
    const imports = items.filter(({kind}: AstNode.All) => kind === 'import');
    if (imports.length && !loader) {
      console.warn('loader required to transitively parse import statements');
      return;
    }
    // transitive dependencies are loaded in parallel
    await Promise.all(imports.map(async (item: AstNode.Import) => {
      const path = loader.join(root, item.path);
      console.log('ManifestParser::parseImports:', root, item.path, path);
      try {
        // TODO(sjmiles): there is no `items` field on the `Import` ast node ...
        item['items'] = await this.load(path, loader, {registry});
      } catch (e) {
        //console.error(e);
        //errors.push(e);
        errors.push(new ManifestError(item.location, `Error importing '${path}'`));
      }
    }));
  }
  // tslint:disable-next-line: no-any
  protected static processError(e: ManifestError /*| any*/, parseError?: boolean): ManifestError {
    // if (!((e instanceof ManifestError) || e.location)) {
    //   return e;
    // }
    return this.processManifestError(e, parseError);
  }
  protected static processManifestError(e: ManifestError, parseError?: boolean): ManifestError {
//     const lines = content.split('\n');
//     const line = lines[e.location.start.line - 1];
//     // TODO(sjmiles): see https://github.com/PolymerLabs/arcs/issues/2570
//     let message: string = e.message || '';
//     if (line) {
//       let span = 1;
//       if (e.location.end.line === e.location.start.line) {
//         span = e.location.end.column - e.location.start.column;
//       } else {
//         span = line.length - e.location.start.column;
//       }
//       span = Math.max(1, span);
//       let highlight = '';
//       for (let i = 0; i < e.location.start.column - 1; i++) {
//         highlight += ' ';
//       }
//       for (let i = 0; i < span; i++) {
//         highlight += '^';
//       }
//       let preamble: string;
//       // Peg Parsing Errors don't have severity attached.
//       const severity = e.severity || ErrorSeverity.Error;
//       if (parseError) {
//         preamble = `Parse ${severity} in`;
//       } else {
//         preamble = `Post-parse processing ${severity} caused by`;
//       }
//       message = `${preamble} '${fileName}' line ${e.location.start.line}.
// ${e.message}
// ${line}
// ${highlight}`;
//     }
//     const err = new ManifestError(e.location, message);
//     if (!parseError) {
//       err.stack = e.stack;
//     }
//     return err;
       return null;
  } // end processManifestError
}
