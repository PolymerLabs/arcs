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
import {KotlinGenerationUtils, quote} from './kotlin-generation-utils.js';
import {HandleConnection} from '../runtime/recipe/handle-connection.js';
import {StorageKey} from '../runtime/storageNG/storage-key.js';
import {Direction} from '../runtime/manifest-ast-nodes.js';

const ktUtils = new KotlinGenerationUtils();

export class PlanGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanGeneratorError';
  }
}

/** Generates plan objects from resolved recipes. */
export class PlanGenerator {
  constructor(private resolvedRecipes: Recipe[], private scope: string = 'arcs.core.data') {
  }

  /** Generates a Kotlin file with plan classes derived from resolved recipes. */
  generate(): string {
    const planOutline = [
      this.fileHeader(),
      ...this.createPlans(),
      this.fileFooter()
    ];

    return planOutline.join('\n');
  }

  /** Converts a resolved recipe into a `Plan` object. */
  createPlans(): string[] {
    return this.resolvedRecipes.map(recipe => {
      const planName = `${recipe.name}Plan`;

      const particles = recipe.particles.map((p) => this.createParticle(p));

      const start = `object ${planName} : `;
      return `${start}${ktUtils.applyFun('Plan', particles, 'Plan', start.length)}`;
    });
  }

  /** Generates a Kotlin `Plan.Particle` instantiation from a Particle. */
  createParticle(particle: Particle): string {
    const spec = particle.spec;
    const location = (spec && (spec.implBlobUrl || (spec.implFile && spec.implFile.replace('/', '.')))) || '';

    const connectionMappings = Object.entries(particle.connections)
      .map(([key, conn]) => `"${key}" to ${this.createHandleConnection(conn)}`);

    return ktUtils.applyFun('Particle', [
      quote(particle.name),
      quote(location),
      ktUtils.mapOf(connectionMappings)
    ]);
  }

  /** Generates a Kotlin `Plan.HandleConnection` from a HandleConnection. */
  createHandleConnection(connection: HandleConnection): string {
    const storageKey = this.createStorageKey(connection.handle.storageKey);
    const mode = this.createDirection(connection.direction);
    const type = this.createType(connection.type);
    const ttl = 'null';

    return ktUtils.applyFun('HandleConnection', [storageKey, mode, type, ttl]);
  }

  /** Generates a Kotlin `HandleMode` from a Direction. */
  createDirection(direction: Direction): string {
    switch (direction) {
      case 'reads': return 'HandleMode.Read';
      case 'writes': return 'HandleMode.Write';
      case 'reads writes': return 'HandleMode.ReadWrite';
      default: throw new PlanGeneratorError(
        `HandleConnection direction '${direction}' is not supported.`);
    }
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
