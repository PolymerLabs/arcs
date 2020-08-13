/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlanGenerator} from '../plan-generator.js';
import {assert} from '../../platform/chai-node.js';
import {Manifest} from '../../runtime/manifest.js';
import {AllocatorRecipeResolver} from '../allocator-recipe-resolver.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {Loader} from '../../platform/loader.js';

describe('plan generator', () => {
  it('imports arcs.core.data when the package is different', () => {
    const generator = new PlanGenerator([], 'some.package');

    const actual = generator.fileHeader();

    assert.include(actual, 'import arcs.core.data.*');
  });
  it('does not import arcs.core.data when the package is the same', () => {
    const generator = new PlanGenerator([], 'arcs.core.data');

    const actual = generator.fileHeader();

    assert.notInclude(actual, 'import arcs.core.data.*');
  });
  it('fully qualifies particle schemas when in different package name', async () => {
    const loader = new Loader(null, {
      '/particle.arcs': `
        meta
          namespace: foo.bar

        particle ParticleFoo in '.ParticleFoo'
          foo: writes Person {name: Text}
      `,
      '/recipe.arcs': `
        meta
          namespace: baz.foo
        import './particle.arcs'

        recipe R
          h: create
          ParticleFoo
            foo: h
      `,
    });

    const {generator, recipes} = await processManifest(await Manifest.load('/recipe.arcs', loader));

    assert.deepStrictEqual(
      await generator.createParticle(recipes[0].particles[0]),
      `\
Particle(
    "ParticleFoo",
    "foo.bar.ParticleFoo",
    mapOf(
        "foo" to HandleConnection(
            R_Handle0,
            HandleMode.Write,
            arcs.core.data.SingletonType(arcs.core.data.EntityType(foo.bar.ParticleFoo_Foo.SCHEMA)),
            emptyList()
        )
    )
)`
    );
  });

  async function process(manifestString: string, policiesManifestString?: string): Promise<{
    recipes: Recipe[],
    generator: PlanGenerator,
    plan: string
  }> {
    return processManifest(await Manifest.parse(manifestString), policiesManifestString);
  }

  async function processManifest(manifest: Manifest, policiesManifestString?: string): Promise<{
      recipes: Recipe[],
      generator: PlanGenerator,
      plan: string
  }> {
    const policiesManifest = policiesManifestString ? await Manifest.parse(policiesManifestString) : null;
    const recipes = await new AllocatorRecipeResolver(manifest, 'random_salt', policiesManifest).resolve();
    const generator = new PlanGenerator(recipes, manifest.meta.namespace || 'test.namespace');
    const plan = await generator.generate();
    return {recipes, generator, plan};
  }
});
