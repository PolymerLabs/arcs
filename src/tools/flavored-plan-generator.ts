/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Recipe} from '../runtime/recipe/lib-recipe.js';
import {KotlinGenerationUtils, upperFirst, tryImport} from './kotlin-generation-utils.js';
import {PlanGenerator} from './plan-generator.js';
import {Dictionary} from '../utils/lib-utils.js';

const ktUtils = new KotlinGenerationUtils();

export class FlavoredPlanGenerator {
  constructor(private flavoredRecipes: Dictionary<Recipe[]>,
              private resolvedRecipeNames: Set<string>,
              private namespace: string,
              private flavorSelector: string
             ) {}

  /** Generates a Kotlin file with plan classes derived from resolved recipes. */
  async generate(): Promise<string> {
    const emptyPlanGenerator = new PlanGenerator([], this.namespace);

    const planOutline = [
      emptyPlanGenerator.fileHeader(),
      ...(await this.createPlans()),
      '\n',
      ...(await this.createPlanSelectors()),
      emptyPlanGenerator.fileFooter()
    ];

    return planOutline.join('\n');
  }

  async createPlans(): Promise<string[]> {
    const allPlans: string[] = [];
    for (const flavor of Object.keys(this.flavoredRecipes)) {
      const recipe = this.flavoredRecipes[flavor];
      const planGenerator = new PlanGenerator(recipe, this.namespace);
      // const plan = (await planGenerator.createPlans()).join('\n');
      // ktUtils.indent(plan, 1),
      allPlans.push(
        `class ${this.flavorClass(flavor)} {`,
        `  companion object {`,
        ktUtils.joinWithIndents(
          await planGenerator.createPlans(),
          {startIndent: 0, numberOfIndents: 1}),
        '  }',
        `}\n`,
      );
    }
    return allPlans;
  }

  private flavorClass(flavor: string): string {
    return `${upperFirst(flavor)}Plans`;
  }

  async createPlanSelectors(): Promise<string[]> {
    const flavors = Object.keys(this.flavoredRecipes);
    const allPlans: string[] = [];
    for (const recipeName of this.resolvedRecipeNames) {
      allPlans.push(
        await this.createSelectorExpression(recipeName, flavors));
    }
    return allPlans;
  }

  private async createSelectorExpression(
    recipeName: string, flavors: string[]): Promise<string> {
    const planName = `${recipeName}Plan`;
    return ktUtils.property(`${planName}`, async ({startIndent}) => {
      return [
        `when (${this.flavorSelector}) {`,
        ...flavors.map(flavor =>
          ktUtils.indent(
            `case "${flavor}": ${this.flavorClass(flavor)}.${planName}`,
          )),
        '}'
      ].join('\n');
    }, {delegate: 'lazy'});
  }
}
