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
import {generateConnectionType} from './kotlin-codegen-shared.js';
import {HandleConnection} from '../runtime/recipe/handle-connection.js';
import {Direction} from '../runtime/manifest-ast-nodes.js';
import {Handle} from '../runtime/recipe/handle.js';
import {Capabilities, Ttl, TtlUnits, Persistence, Shareable} from '../runtime/capabilities.js';
import {findLongRunningArcId} from './storage-key-recipe-resolver.js';
import {digest} from '../platform/digest-web.js';

const ktUtils = new KotlinGenerationUtils();

export class PlanGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanGeneratorError';
  }
}

/** Generates plan objects from resolved recipes. */
export class PlanGenerator {

  constructor(private resolvedRecipes: Recipe[], private namespace: string) {
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
    const plans: string[] = [];
    for (const recipe of this.resolvedRecipes) {
      const planName = `${recipe.name}Plan`;
      const arcId = findLongRunningArcId(recipe);

      const particles: string[] = [];
      for (const particle of recipe.particles) {
        particles.push(await this.createParticle(particle));
      }

      const planArgs = [ktUtils.listOf(particles)];
      if (arcId) {
        planArgs.push(quote(arcId));
      }

      const start = `object ${planName} : `;
      const plan = `${start}${ktUtils.applyFun('Plan', planArgs, {startIndent: start.length})}`;
      plans.push(plan);
    }
    return plans;
  }

  /** Generates a Kotlin `Plan.Particle` instantiation from a Particle. */
  async createParticle(particle: Particle): Promise<string> {
    const spec = particle.spec;
    const locationFromFile = (spec.implFile && spec.implFile.substring(spec.implFile.lastIndexOf('/') + 1));
    const location = (spec && (spec.implBlobUrl || locationFromFile)) || '';
    const connectionMappings: string[] = [];
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
    const storageKey = await this.createStorageKey(connection.handle);
    const mode = this.createHandleMode(connection.direction, connection.type);
    const type = generateConnectionType(connection);
    const ttl = PlanGenerator.createTtl(connection.handle.getTtl());

    return ktUtils.applyFun('HandleConnection', [storageKey, mode, type, ttl], {startIndent: 24});
  }

  /** Generates a Kotlin `HandleMode` from a Direction and Type. */
  createHandleMode(direction: Direction, type: Type): string {
    const schema = type.getEntitySchema();
    const isQuery = (schema && schema.hasQuery()) ? 'Query' : '';
    switch (direction) {
      case 'reads': return `HandleMode.Read${isQuery}`;
      case 'writes': return `HandleMode.Write${isQuery}`;
      case 'reads writes': return `HandleMode.ReadWrite${isQuery}`;
      default: throw new PlanGeneratorError(
        `HandleConnection direction '${direction}' is not supported.`);
    }
  }

  /** Generates a Kotlin `StorageKey` from a recipe Handle. */
  async createStorageKey(handle: Handle): Promise<string> {
    if (handle.storageKey) {
      return ktUtils.applyFun('StorageKeyParser.parse', [quote(handle.storageKey.toString())]);
    }
    if (handle.fate === 'join') {
      // TODO(piotrs): Implement JoinStorageKey in TypeScript.
      const components = handle.joinedHandles.map(h => h.storageKey);
      const joinSk = `join://${components.length}/${components.map(sk => `{${sk.embedKey()}}`).join('/')}`;
      return ktUtils.applyFun('StorageKeyParser.parse', [quote(joinSk)]);
    }
    throw new PlanGeneratorError(`Problematic handle '${handle.id}': Only 'create' Handles can have null 'StorageKey's.`);
  }

  /** Generates a Kotlin `Ttl` from a Ttl. */
  static createTtl(ttl: Ttl): string {
    if (ttl.isInfinite) return 'Ttl.Infinite';
    return ktUtils.applyFun(this.createTtlUnit(ttl.units), [ttl.count.toString()]);
  }

  /** Translates TtlUnits to Kotlin Ttl case classes. */
  static createTtlUnit(ttlUnits: TtlUnits): string {
    switch (ttlUnits) {
      case TtlUnits.Minutes: return `Ttl.Minutes`;
      case TtlUnits.Hours: return `Ttl.Hours`;
      case TtlUnits.Days: return `Ttl.Days`;
      default: return `Ttl.Infinite`;
    }
  }

  fileHeader(): string {
    return `\
/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package ${this.namespace}

//
// GENERATED CODE -- DO NOT EDIT
//

${tryImport('arcs.core.data.*', this.namespace)}
${tryImport('arcs.core.storage.StorageKeyParser', this.namespace)}
`;
  }

  fileFooter(): string {
    return ``;
  }
}
