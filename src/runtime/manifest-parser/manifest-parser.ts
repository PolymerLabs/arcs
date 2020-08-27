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
import {Dictionary} from '../../utils/hot.js';

type Ast = AstNode.All[];

interface ManifestLoadOptions {
  registry?: Dictionary<Promise<Ast>>;
  //memoryProvider?: VolatileMemoryProvider;
}

export interface ManifestParseOptions {
  filename?: string;
  loader?: Loader;
  registry?: Dictionary<Promise<Ast>>;
  throwImportErrors?: boolean;
  //context?/*: Manifest*/;
  //memoryProvider?: VolatileMemoryProvider;
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
    const content = await loader.loadResource(path);
    const promise = this.parse(content, {...options, filename: path, loader});
    if (registry) {
      registry[path] = promise;
    }
    return await promise;
  }
  // static async parse(content: string, options: ManifestParseOptions = {}): Promise<Manifest> {
  static async parse(content: string, options: ManifestParseOptions = {}): Promise<Ast> {
    // allow `context` for including an existing manifest in the import list
    let {filename, loader, registry} = options;
    let items: AstNode.All[] = [];
    try {
      items = parser(content, {filename}) as AstNode.All[];
    } catch (e) {
      console.error('uhps');
      throw e;
      //throw processError(e, true);
    }
    //console.log(items.length);
    await this.parseImports(filename, loader, items, registry);
    return items;
  }
  static async parseImports(root, loader: Loader, items, registry) {
    // TODO(sjmiles): not `typeof AstNode.Import`?
    const imports = items.filter(({kind}: AstNode.All) => kind === 'import');
    // Transitive dependencies are loaded in parallel
    await Promise.all(imports.map(async (item: AstNode.Import) => {
      if (!loader) {
        throw new Error('loader required to parse import statements');
      }
      const path = loader.join(root, item.path);
      console.log('ManifestParser::parseImports:', root, item.path, path);
      try {
        // TODO(sjmiles): there is no `items` field on the `Import` ast node ...
        item["items"] = await this.load(path, loader, {registry});
      } catch (e) {
        console.error(e);
        //errors.push(e);
        //errors.push(new ManifestError(item.location, `Error importing '${target}'`));
      }
    }));
  }
  static extract(kind, items) {
    let results = [];
    items.forEach(item => {
      if (item.kind === kind) {
        results.push(item);
      }
      if (item.kind === 'import' && item.items) {
        results = results.concat(this.extract(kind, item.items));
      }
    });
    return results;
  }
}
