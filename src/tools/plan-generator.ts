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
import {Particle} from '../runtime/recipe/particle.js';
import {Manifest} from '../runtime/manifest.js';
import {KotlinGenerationUtils} from './kotlin-generation-utils.js';

const ktUtils = new KotlinGenerationUtils();

export class PlanGenerator {
  constructor(private resolutions: Recipe[], private manifest: Manifest, private scope: string = 'arcs.core.data') {}

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

      const particles = recipe.particles.map(this.createParticle);

      const plan = `\
object ${planName} : Plan(${ktUtils.listOf(particles)})`;

      plans.push(plan);
    }

    return plans;
  }

  createParticle(particle: Particle): string {
    const spec = particle.spec;
    const location = (spec && (spec.implBlobUrl || (spec.implFile && spec.implFile.replace('/', '.')))) || '';

    return `\
Particle(
    "${particle.name}",
    "${location}",
    ${ktUtils.mapOf([])} 
)`;
  }

  createType(type: Type): string {
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
}
