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
import {KotlinGenerationUtils, quote, tryImport, upperFirst} from './kotlin-generation-utils.js';
import {HandleConnection} from '../runtime/recipe/handle-connection.js';
import {Direction} from '../runtime/manifest-ast-nodes.js';
import {Handle} from '../runtime/recipe/handle.js';
import {Ttl, TtlUnits} from '../runtime/recipe/ttl.js';
import {Dictionary} from '../runtime/hot.js';
import {Random} from '../runtime/random.js';
import {findLongRunningArcId} from './storage-key-recipe-resolver.js';
import {Capabilities} from '../runtime/capabilities.js';

const ktUtils = new KotlinGenerationUtils();

export class PlanGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanGeneratorError';
  }
}

/** Generates plan objects from resolved recipes. */
export class PlanGenerator {
  private specRegistry: Dictionary<string> = {};
  private createHandleRegistry: Map<Handle, string> = new Map<Handle, string>();

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
        await this.collectParticleConnectionSpecs(particle);
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

  /** Aggregate mapping of schema hashes and schema properties from particle connections. */
  async collectParticleConnectionSpecs(particle: Particle): Promise<void> {
    for (const connection of particle.spec.connections) {
      const specName = [particle.spec.name, upperFirst(connection.name)].join('_');
      const schemaHash = await connection.type.getEntitySchema().hash();
      this.specRegistry[schemaHash] = specName;
    }
  }

  /** Generates a Kotlin `Plan.HandleConnection` from a HandleConnection. */
  async createHandleConnection(connection: HandleConnection): Promise<string> {
    const storageKey = this.createStorageKey(connection.handle);
    const mode = this.createHandleMode(connection.direction, connection.type);
    const type = await this.createType(connection.type);
    const ttl = this.createTtl(connection.handle.ttl);

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
  createStorageKey(handle: Handle): string {
    if (handle.storageKey) {
      return ktUtils.applyFun('StorageKeyParser.parse', [quote(handle.storageKey.toString())]);
    }
    if (handle.fate === 'create') {
      const createKeyArgs = [quote(this.createCreateHandleId(handle))];
      const capabilities = this.createCapabilities(handle.capabilities);
      if (capabilities !== 'Capabilities.Empty') {
        createKeyArgs.push(capabilities);
      }
      return ktUtils.applyFun('CreateableStorageKey', createKeyArgs);
    }
    throw new PlanGeneratorError(`Problematic handle '${handle.id}': Only 'create' Handles can have null 'StorageKey's.`);
  }

  /** Generates a consistent handle id. */
  createCreateHandleId(handle: Handle): string {
    if (handle.id) return handle.id;
    if (!this.createHandleRegistry.has(handle)) {
      const rand = Math.floor(Random.next() * Math.pow(2, 50));
      this.createHandleRegistry.set(handle, `handle/${rand}`);
    }
    return this.createHandleRegistry.get(handle);
  }

  /** Generates Kotlin `Capabilities` from Capabilities. */
  createCapabilities(capabilities: Capabilities): string {
    const ktCapabilities  = [];

    if (capabilities.isEmpty()) {
      return 'Capabilities.Empty';
    }

    if (capabilities.isPersistent) {
      ktCapabilities.push('Capabilities.Capability.Persistent');
    }

    if (capabilities.isQueryable) {
      ktCapabilities.push('Capabilities.Capability.Queryable');
    }

    if (capabilities.isTiedToArc) {
      ktCapabilities.push('Capabilities.Capability.TiedToArc');
    }

    if (capabilities.isTiedToRuntime) {
      ktCapabilities.push('Capabilities.Capability.TiedToRuntime');
    }

    if (ktCapabilities.length === 1) {
      return ktCapabilities[0].replace('Capability.', '');
    }

    return ktUtils.applyFun('Capabilities', [ktUtils.setOf(ktCapabilities)]);
  }

  /** Generates a Kotlin `Ttl` from a Ttl. */
  createTtl(ttl: Ttl): string {
    if (ttl.isInfinite) return 'Ttl.Infinite';
    return ktUtils.applyFun(this.createTtlUnit(ttl.units), [ttl.count.toString()]);
  }

  /** Translates TtlUnits to Kotlin Ttl case classes. */
  createTtlUnit(ttlUnits: TtlUnits): string {
    switch (ttlUnits) {
      case TtlUnits.Minute: return `Ttl.Minutes`;
      case TtlUnits.Hour: return `Ttl.Hours`;
      case TtlUnits.Day: return `Ttl.Days`;
      default: return `Ttl.Infinite`;
    }
  }

  /** Generates a Kotlin `core.arc.type.Type` from a Type. */
  async createType(type: Type): Promise<string> {
    const initialType = await this.createNestedType(type);
    return (type.isEntity || type.isReference) ?
      ktUtils.applyFun('SingletonType', [initialType]) : initialType;
  }
  async createNestedType(type: Type) {
    switch (type.tag) {
      case 'Collection':
        return ktUtils.applyFun('CollectionType', [await this.createNestedType(type.getContainedType())]);
      case 'Count':
        return ktUtils.applyFun('CountType', [await this.createNestedType(type.getContainedType())]);
      case 'Entity':
        return ktUtils.applyFun('EntityType', [`${this.specRegistry[await type.getEntitySchema().hash()]}.SCHEMA`]);
      case 'Reference':
        return ktUtils.applyFun('ReferenceType', [await this.createNestedType(type.getContainedType())]);
      case 'Singleton':
        return ktUtils.applyFun('SingletonType', [await this.createNestedType(type.getContainedType())]);
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
