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
import {KotlinGenerationUtils, KT_DEFAULT, leftPad} from './kotlin-generation-utils.js';
import {HandleConnectionSpec} from '../runtime/particle-spec.js';
import {Handle} from '../runtime/recipe/handle.js';
import {HandleConnection} from '../runtime/recipe/handle-connection.js';
import {StorageKey} from '../runtime/storageNG/storage-key.js';

const ktUtils = new KotlinGenerationUtils();

export class PlanGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanGeneratorError';
  }
}

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

      const particles = recipe.particles.map((p) => this.createParticle(p));

      const start = `object ${planName} : `;
      const plan = `${start}${ktUtils.applyFun('Plan', particles, 'Plan', start.length)}`;
      plans.push(plan);
    }

    return plans;
  }

  createParticle(particle: Particle): string {
    const spec = particle.spec;
    const location = (spec && (spec.implBlobUrl || (spec.implFile && spec.implFile.replace('/', '.')))) || '';

    const particleName = `"${particle.name}"`;
    const locationArg = `"${location}"`;

    const connectionMappings = [...Object.entries(particle.connections)]
      .map(([key, conn]) => `"${key}" to ${this.createHandleConnection(conn)}`);

    return ktUtils.applyFun('Particle', [particleName, locationArg, ktUtils.mapOf(connectionMappings)]);
  }

  createHandleConnection(connection: HandleConnection): string {
    const storageKey = this.createStorageKey(connection.handle.storageKey);
    let mode;
    switch (connection.direction) {
      case 'reads':
        mode = 'HandleMode.Read';
        break;
      case 'writes':
        mode = 'HandleMode.Write';
        break;
      case 'reads writes':
        mode = 'HandleMode.ReadWrite';
        break;
      default:
        throw new PlanGeneratorError(`HandleConnection direction '${connection.direction}' is not supported.`)
    }
    const type = '';
    const ttl = 'null';

    return ktUtils.applyFun('HandleConnection', [storageKey, mode, type, ttl]);
  }

  createStorageKey(storageKey: StorageKey | undefined): string {
    return `StorageKeyParser.parse("${(storageKey || '').toString()})"`;
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
import arcs.core.storage.*
`;
  }

  fileFooter(): string {
    return ``;
  }
}
