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
import {KotlinGenerationUtils, quote, tryImport} from './kotlin-generation-utils.js';
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
  constructor(private resolvedRecipes: Recipe[], private scope: string) {
  }

  /** Generates a Kotlin file with plan classes derived from resolved recipes. */
  async generate(): Promise<string> {
    const planOutline = [
      this.fileHeader(),
      ...(await this.createPlans()),
      this.fileFooter()
    ];

    return planOutline.join('\n');
  }

  /** Converts a resolved recipe into a `Plan` object. */
  async createPlans(): Promise<string[]> {
    const plans = [];
    for (const recipe of this.resolvedRecipes) {
      const planName = `${recipe.name}Plan`;

      const particles = [];
      for (const particle of recipe.particles) {
        particles.push(await this.createParticle(particle));
      }

      const start = `object ${planName} : `;
      const plan = `${start}${ktUtils.applyFun('Plan', particles, 'Plan', start.length)}`;
      plans.push(plan);
    }
    return plans;
  }

  /** Generates a Kotlin `Plan.Particle` instantiation from a Particle. */
  async createParticle(particle: Particle): Promise<string> {
    const spec = particle.spec;
    const location = (spec && (spec.implBlobUrl || (spec.implFile && spec.implFile.replace('/', '.')))) || '';

    const connectionMappings = [];
    for (const [key, conn] of Object.entries(particle.connections)) {
      connectionMappings.push(`"${key}" to ${await this.createHandleConnection(conn)}`);
    }

    return ktUtils.applyFun('Particle', [
      quote(particle.name),
      quote(location),
      ktUtils.mapOf(connectionMappings, 12)
    ]);
  }

  /** Generates a Kotlin `Plan.HandleConnection` from a HandleConnection. */
  async createHandleConnection(connection: HandleConnection): Promise<string> {
    const storageKey = this.createStorageKey(connection.handle.storageKey);
    const mode = this.createDirection(connection.direction);
    const type = this.createType(connection.type);
    const ttl = 'null';

    return ktUtils.applyFun('HandleConnection', [storageKey, mode, type, ttl], 24);
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
  async createType(type: Type): Promise<string> {
    switch (type.tag) {
      case 'Collection':
        return ktUtils.applyFun('CollectionType', [await this.createType(type.getContainedType())]);
      case 'Count':
        return ktUtils.applyFun('CountType', [await this.createType(type.getContainedType())]);
      case 'Entity':
        return ktUtils.applyFun('EntityType', [`SchemaRegistry["${await type.getEntitySchema().hash()}"]`])
      case 'Reference':
        return ktUtils.applyFun('ReferenceType', [await this.createType(type.getContainedType())]);
      case 'Singleton':
        return ktUtils.applyFun('SingletonType', [await this.createType(type.getContainedType())]);
      case 'TypeVariable':
      case 'Arc':
      case 'BigCollection':
      case 'Handle':
      case 'Interface':
      case 'Slot':
      case 'Tuple':
      default:
        throw Error(`Type of ${type.tag} is not supported.`);
    }
  }

  fileHeader(): string {
    return `\
/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package ${this.scope}

//
// GENERATED CODE -- DO NOT EDIT
//

${tryImport('arcs.core.data.*', this.scope)}
${tryImport('arcs.core.storage.*', this.scope)}
`;
  }

  fileFooter(): string {
    return ``;
  }
}
