/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Runtime} from '../runtime/runtime.js';
import {StorageKeyRecipeResolver} from './storage-key-recipe-resolver.js';
import {PlanGenerator} from './plan-generator.js';
import {Flags} from '../runtime/flags.js';
import {assert} from '../platform/assert-node.js';


/**
 * Generates Kotlin Plans from recipes in an arcs manifest.
 *
 * @param path path/to/manifest.arcs
 * @param scope kotlin package name
 * @return Generated Kotlin code.
 */
export async function recipe2plan(path: string): Promise<string> {
  return await Flags.withDefaultReferenceMode(async () => {
    const manifest = await Runtime.parseFile(path);

    assert(manifest.meta.namespace, `Namespace is required in '${path}' for code generation.`);
    const recipes = await (new StorageKeyRecipeResolver(manifest)).resolve();

    const generator = new PlanGenerator(recipes, manifest.meta.namespace);

    return generator.generate();
  })();
}
