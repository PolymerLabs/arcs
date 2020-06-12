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
import {encodePlansToProto} from './manifest2proto.js';

export enum OutputFormat { Kotlin, Proto }

/**
 * Generates Kotlin Plans from recipes in an arcs manifest.
 *
 * @param path path/to/manifest.arcs
 * @return Generated Kotlin code.
 */
export async function recipe2plan(
    path: string,
    format: OutputFormat,
    recipeFilter?: string): Promise<string | Uint8Array> {
  return await Flags.withDefaultReferenceMode(async () => {
    const manifest = await Runtime.parseFile(path);
    let plans = await (new StorageKeyRecipeResolver(manifest, `salt_${Math.random()}`)).resolve();

    if (recipeFilter) {
      plans = plans.filter(p => p.name === recipeFilter);
      if (plans.length === 0) throw Error(`Recipe '${recipeFilter}' not found.`);
    }

    switch (format) {
      case OutputFormat.Kotlin:
        assert(manifest.meta.namespace, `Namespace is required in '${manifest.fileName}' for Kotlin code generation.`);
        return new PlanGenerator(plans, manifest.meta.namespace).generate();
      case OutputFormat.Proto:
        return Buffer.from(await encodePlansToProto(plans));
      default: throw new Error('Output Format should be Kotlin or Proto');
    }
  })();
}
