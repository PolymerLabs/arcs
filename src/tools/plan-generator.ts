/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Recipe} from '../runtime/recipe/recipe.js';

export class PlanGenerator {
  constructor(private resolutions: AsyncGenerator<Recipe>, private scope: string = 'arcs.core.data') {
  }

  /** Generates a Kotlin file with plan classes derived from resolved recipes. */
  async generate(): Promise<string> {
    const planOutline = [
      this.fileHeader(),
      (await this._generate()).join('\n'),
      this.fileFooter()
    ];

    return planOutline.join('\n');
  }

  private async _generate(): Promise<string[]>  {
    const plans = [];

    for await (const recipe of this.resolutions) {
      const planName = `${recipe.name}Plan`;
      const plan = `\
class ${planName} : Plan(particles) {
    val particles = listOf()
}`;
      plans.push(plan);
    }

    return plans;
  }

  private fileHeader(): string {
    return `\
/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package ${this.scope}

//
// GENERATED CODE -- DO NOT EDIT
//

import arcs.core.data.*;
`;
  }

  private fileFooter(): string {
    return ``;
  }

}
