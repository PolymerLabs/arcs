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
import {Type} from '../runtime/type.js';

export class PlanGenerator {
  constructor(private resolutions: Recipe[], private scope: string = 'arcs.core.data') {
  }

  /** Generates a Kotlin file with plan classes derived from resolved recipes. */
  async generate(): Promise<string> {
    const planOutline = [
      this.fileHeader(),
      (await this.createPlans()).join('\n'),
      this.fileFooter()
    ];

    return planOutline.join('\n');
  }

  private async createPlans(): Promise<string[]>  {
    const plans = [];

    for (const recipe of this.resolutions) {
      const planName = `${recipe.name.replace(/[rR]ecipe/, '')}Plan`;

      const plan = `\
class ${planName} : Plan(particles) {
    val particles = listOf()
}`;
      plans.push(plan);
    }

    return plans;
  }

  mapTypeToProperty(type: Type): string {
    switch (type.tag) {
      case 'Collection':
        break;
      case 'Entity':
        break;
      case 'Handle':
        break;
      case 'Reference':
        break;
      case 'Singleton':
        break;
      case 'TypeVariable':
        break;
      case 'Arc':
      case 'BigCollection':
      case 'Count':
      case 'Interface':
      case 'Slot':
      case 'Tuple':
      default:
        throw Error(`Type of tag ${type.tag} is not supported.`);
    }
    return '';
  }

  fileHeader(): string {
    return `\
/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package ${this.scope}

//
// GENERATED CODE -- DO NOT EDIT
//

${this.scope === 'arcs.core.data' ? '' : 'import arcs.core.data.*'}
`;
  }

  fileFooter(): string {
    return ``;
  }

  private mapOf(items: Map<string, string>, indent: number): string {
    if (items.size === 0) return 'mapOf()';

    const mapping = [...items.entries()].map(([key, val]) => `"${key}" to ${val}`);

    return `mapOf(${this.joinWithinLimit(mapping, indent)})`;
  }

  private joinWithinLimit(items: string[], indent: number, lineLength: number = 120): string {
    for(const delim of [', ', '\n' + ' '.repeat(indent)]) {
      const candidate = items.join(delim);
      const maxLength = Math.max(...candidate.split('\n').map(line => line.length));
      if (indent + maxLength <= lineLength) return candidate;
    }

    return items.join(', '); // Default: have poor formatting
  }
}
