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
import {KotlinGenerationUtils} from './kotlin-generation-utils.js';
import {HandleConnection} from '../runtime/recipe/handle-connection.js';
import {StorageKey} from '../runtime/storageNG/storage-key.js';

const ktUtils = new KotlinGenerationUtils();

export class PlanGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanGeneratorError';
  }
}

/** Generates plan objects from resolved recipes. */
export class PlanGenerator {
  constructor(private resolutions: Recipe[], private scope: string = 'arcs.core.data') {
  }

  /** Generates a Kotlin file with plan classes derived from resolved recipes. */
  generate(): string {
    const planOutline = [
      this.fileHeader(),
      this.createPlans().join('\n'),
      this.fileFooter()
    ];

    return planOutline.join('\n');
  }

  /** Converts a resolved recipe into a `Plan` object. */
  createPlans(): string[] {
    return this.resolutions.map(recipe => {
      const planName = `${recipe.name.replace(/[rR]ecipe/, '')}Plan`;

      const particles = recipe.particles.map((p) => this.createParticle(p));

      const start = `object ${planName} : `;
      const plan = `${start}${ktUtils.applyFun('Plan', particles, 'Plan', start.length)}`;
      return plan;
    });
  }

  /** Generates a Kotlin `Plan.Particle` instantiation from a Particle. */
  createParticle(particle: Particle): string {
    const spec = particle.spec;
    const location = (spec && (spec.implBlobUrl || (spec.implFile && spec.implFile.replace('/', '.')))) || '';

    const particleName = `"${particle.name}"`;
    const locationArg = `"${location}"`;

    const connectionMappings = [...Object.entries(particle.connections)]
      .map(([key, conn]) => `"${key}" to ${this.createHandleConnection(conn)}`);

    return ktUtils.applyFun('Particle', [particleName, locationArg, ktUtils.mapOf(connectionMappings)]);
  }

  /** Generates a Kotlin `Plan.HandleConnection` from a HandleConnection. */
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
    const type = this.createType(connection.type);
    const ttl = 'null';

    return ktUtils.applyFun('HandleConnection', [storageKey, mode, type, ttl]);
  }

  /** Generates a Kotlin `StorageKey` from a StorageKey. */
  createStorageKey(storageKey: StorageKey | undefined): string {
    return `StorageKeyParser.parse("${(storageKey || '').toString()}")`;
  }

  /** Generates a Kotlin `core.arc.type.Type` from a Type. */
  // TODO(alxr): Implement
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
        throw Error(`Type of ${type.tag} is not supported.`);
    }
    return 'null';
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
