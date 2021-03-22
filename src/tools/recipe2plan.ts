/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {AllocatorRecipeResolver} from './allocator-recipe-resolver.js';
import {PlanGenerator} from './plan-generator.js';
import {FlavoredPlanGenerator} from './flavored-plan-generator.js';
import {assert} from '../platform/assert-node.js';
import {encodePlansToProto} from './manifest2proto.js';
import {Manifest} from '../runtime/manifest.js';
import {Dictionary} from '../utils/lib-utils.js';
import {Recipe} from '../runtime/recipe/lib-recipe.js';

export enum OutputFormat { Kotlin, Proto }

/**
 * Generates Kotlin Plans from recipes in an arcs manifest.
 *
 * @param path path/to/manifest.arcs
 * @param format Kotlin or Proto supported.
 * @param recipeFilter Optionally, target a single recipe within the manifest.
 * @return Generated Kotlin code.
 */
export async function recipe2plan(
    manifest: Manifest,
    format: OutputFormat,
    policiesManifest?: Manifest,
    recipeFilter?: string,
    salt = `salt_${Math.random()}`): Promise<string | Uint8Array> {
  let plans = await (new AllocatorRecipeResolver(manifest, salt, policiesManifest)).resolve();

  if (recipeFilter) {
    plans = plans.filter(p => p.name === recipeFilter);
    if (plans.length === 0) throw Error(`Recipe '${recipeFilter}' not found.`);
  }

  switch (format) {
    case OutputFormat.Kotlin:
      assert(manifest.meta.namespace, `Namespace is required in '${manifest.fileName}' for Kotlin code generation.`);
      return new PlanGenerator(plans, manifest.meta.namespace).generate();
    case OutputFormat.Proto:
      // TODO(b/161818898): pass ingress validation to protos too.
      return Buffer.from(await encodePlansToProto(plans, manifest));
    default: throw new Error('Output Format should be Kotlin or Proto');
  }
}


/**
 * Generates Flavored  Plans from recipes in an arcs manifest.
 *
 * @param path path/to/manifest.arcs
 * @param format Kotlin or Proto supported.
 * @param recipeFilter Optionally, target a single recipe within the manifest.
 * @return Generated Kotlin code.
 */
export async function recipe2flavoredplan(
    manifest: Manifest,
    flavoredPolicies: Dictionary<Manifest>,
    flavorSelector: string,
    recipeFilter?: string,
    salt = `salt_${Math.random()}`): Promise<string | Uint8Array> {

  // TODO: If no policy or one policy is specified default to recipe2plan.
  const flavoredPlans : Dictionary<Recipe[]> = {};
  const resolvedRecipeNames: Set<string> = new Set();
  for (const flavor of Object.keys(flavoredPolicies)) {
    const policiesManifest = flavoredPolicies[flavor];
    let plans = await (new AllocatorRecipeResolver(manifest, salt, policiesManifest)).resolve();
    if (recipeFilter) {
      plans = plans.filter(p => p.name === recipeFilter);
      if (plans.length === 0) throw Error(`Recipe '${recipeFilter}' not found.`);
    }
    plans.forEach(recipe => resolvedRecipeNames.add(recipe.name));
    flavoredPlans[flavor] = plans;
  }

  assert(manifest.meta.namespace, `Namespace is required in '${manifest.fileName}' for Kotlin code generation.`);
  return new FlavoredPlanGenerator(
    flavoredPlans, resolvedRecipeNames, manifest.meta.namespace, flavorSelector).generate();
}
