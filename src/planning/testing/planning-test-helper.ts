/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Suggestion} from '../plan/suggestion.js';
import {Planner} from '../planner.js';
import {RecipeIndex} from '../recipe-index.js';
import {Speculator} from '../speculator.js';
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../../runtime/manifest.js';
import {InterfaceType} from '../../runtime/type.js';
import {TestHelperOptions, TestHelper} from '../../runtime/testing/test-helper.js';
import {devtoolsPlannerInspectorFactory} from '../../devtools-connector/devtools-planner-inspector.js';

type TestHelperPlanOptions = TestHelperOptions & {
  expectedNumPlans?: number;
  expectedSuggestions?;
  includeInnerArcs?: boolean;
  verify?;
};

/**
 * Helper class to recipe instantiation and replanning.
 * Usage example:
 *   let helper = await TestHelper.createAndPlan({manifestFilename: 'my.manifest'});
 *   await helper.acceptSuggestion({particles: ['MyParticle1', 'MyParticle2']});
 *   await helper.verifyData('MyParticle1', 'myHandle1', async (handle) => { ... });
 */
export class PlanningTestHelper extends TestHelper {
  // TODO(lindner): adding the type here causes many compilation errors.
  suggestions;
  recipeIndex: RecipeIndex;

  static async create(options: TestHelperPlanOptions = {}): Promise<PlanningTestHelper> {
    await TestHelper.setupOptions(options);
    Planner.clearCache();
    const helper = new PlanningTestHelper();
    TestHelper.setupHelper(options, helper);
    helper.recipeIndex = RecipeIndex.create(helper.arc);
    return helper;
  }

  /**
   * Creates a Test Helper instances and triggers planning .
   */
  static async createAndPlan(options: TestHelperPlanOptions): Promise<PlanningTestHelper> {
    const helper = await PlanningTestHelper.create(options);
    await helper.makePlans(options);
    return helper;
  }

  static async parseManifest(manifestString: string, loader) : Promise<Manifest> {
    return TestHelper.parseManifest(manifestString, loader);
  }

  /**
   * Generates suggestions for the arc.
   * |options| contains possible verifications to be performed on the generated plans:
   *   - expectedNumPlans: (optional) number of expected number of generated suggestions to verify.
   *   - expectedSuggestions: (optional) list of expected description texts representing the generated suggestion.
   *   - verify: a handler method to be called to verify the resulting suggestions.
   */
  async makePlans(options?: TestHelperPlanOptions): Promise<PlanningTestHelper> {
    const planner = new Planner();
    planner.init(this.arc, {
      strategyArgs: {recipeIndex: this.recipeIndex},
      speculator: new Speculator(),
      inspectorFactory: devtoolsPlannerInspectorFactory
    });
    this.suggestions = await planner.suggest();
    if (options && options.includeInnerArcs) {
      for (const innerArc of this.arc.innerArcs) {
        const innerPlanner = new Planner();
        innerPlanner.init(innerArc, {strategyArgs: {recipeIndex: this.recipeIndex}, speculator: new Speculator()});
        this.suggestions = this.suggestions.concat(await innerPlanner.suggest());
      }
    }
    if (options) {
      if (options.expectedNumPlans) {
        assert.lengthOf(this.suggestions, options.expectedNumPlans);
      }
      if (options.expectedSuggestions) {
        const suggestions = this.suggestions.map(s => s.descriptionText);
        const missingSuggestions = options.expectedSuggestions.filter(expectedSuggestion => !suggestions.find(s => s === expectedSuggestion));
        const unexpectedSuggestions = suggestions.filter(suggestion => !options.expectedSuggestions.find(s => s === suggestion));
        const errors: string[] = [];
        if (missingSuggestions.length > 0) {
          errors.push(`Missing suggestions:\n\t ${missingSuggestions.join('\n\t')}`);
        }
        if (unexpectedSuggestions.length > 0) {
          errors.push(`Unexpected suggestions:\n\t ${unexpectedSuggestions.join('\n\t')}`);
        }
        assert.equal(0, missingSuggestions.length + unexpectedSuggestions.length, errors.join('\n'));
      }
      if (options.verify) {
        await options.verify(this.suggestions);
      }
    }
    this.log(`Made ${this.suggestions.length} plans.`);
    return this;
  }

  /**
   * Accepts a suggestion. |options| may provide the exact list of particles representing the
   * suggestion to accept. Otherwise, fallback to a single generated suggestion, if appropriate.
   */
  async acceptSuggestion(options?: {hostedParticles?: string[], particles?: string[], descriptionText?: string}): Promise<void> {
    let suggestion;
    if (options) {
      if (options.particles) {
        let suggestions = this.findSuggestionByParticleNames(options.particles);
        if (options.hostedParticles) {
          suggestions = suggestions.filter(p => {
            return options.hostedParticles.every(hosted => {
              const interfaceHandles = p.plan.handles.filter(h => h.type instanceof InterfaceType);
              return interfaceHandles.find(handle => this.arc.findStoreById(handle.id)._stored.name === hosted);
            });
          });
        }
        assert.lengthOf(suggestions, 1);
        suggestion = suggestions[0];
      } else if (options.descriptionText) {
        suggestion = this.suggestions.find(p => p.descriptionText === options.descriptionText);
      }
    }
    if (!suggestion) {
      assert.lengthOf(this.suggestions, 1);
      suggestion = this.suggestions[0];
    }
    this.log(`Accepting suggestion: '${suggestion.descriptionText ? ((str) => str.length > 50 ? str.substring(0, Math.min(str.length, 50)).concat('...') : str)(suggestion.descriptionText) : `undefined`}'`);
    await this.instantiateSuggestion(suggestion);
  }

  findSuggestionByParticleNames(particlesNames: string[]) {
    return this.suggestions.filter(p => {
      const planParticles = p.plan.particles.map(particle => particle.name);
      return planParticles.length === particlesNames.length && planParticles.every(p => particlesNames.includes(p));
    });
  }

  async instantiateSuggestion(suggestion: Suggestion) {
    assert(suggestion, `Cannot accept suggestion, no plan could be selected.`);
    await suggestion.instantiate(this.arc);
    await this.idle();
  }

  /**
   * Getter for a single available suggestion plan (fails, if there is more than one).
   */
  get plan() {
    assert.lengthOf(this.suggestions, 1);
    return this.suggestions[0].plan;
  }

}
