/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Recipe, Handle, Particle, HandleConnection} from '../runtime/recipe/lib-recipe.js';
import {Type} from '../types/lib-types.js';
import {KotlinGenerationUtils, quote, multiLineQuote, tryImport} from './kotlin-generation-utils.js';
import {generateConnectionType, generateHandleType} from './kotlin-type-generator.js';
import {Direction} from '../runtime/arcs-types/enums.js';
import {annotationsToKotlin} from './annotations-utils.js';

const ktUtils = new KotlinGenerationUtils();

export class PlanGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanGeneratorError';
  }
}

/** Generates plan objects from resolved recipes. */
export class PlanGenerator {

  constructor(private resolvedRecipes: Recipe[],
              private namespace: string) {}

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
    const declarations: string[] = [];
    for (const recipe of this.resolvedRecipes) {
      const plan = await ktUtils.property(`${recipe.name}Plan`, async ({startIndent}) => {
        return ktUtils.applyFun(`Plan`, [
          ktUtils.listOf(await Promise.all(recipe.particles.map(p => this.createParticle(p)))),
          ktUtils.listOf(recipe.handles.map(h => this.handleVariableName(h))),
          annotationsToKotlin(recipe.annotations)
        ], {startIndent});
      }, {delegate: 'lazy'});

      const handles = await Promise.all(recipe.handles.map(h => this.createHandleVariable(h)));

      declarations.push([
        ...handles,
        plan
      ].join('\n'));
    }
    return declarations;
  }

  /**
   * @returns a name of the generated Kotlin variable with a Plan.handle corresponding to the given handle.
   */
  handleVariableName(handle: Handle): string {
    return `${handle.recipe.name}_Handle${handle.recipe.handles.indexOf(handle)}`;
  }

  /**
   * Generates a variable for a handle to be places inside a `Plan.Particle` object.
   * We generate a variable instead of a inlining a handle, as we want to reference
   * a handle both in a list of all plan handles, as well as in individual handle connections.
   */
  async createHandleVariable(handle: Handle): Promise<string> {
    handle.type.maybeEnsureResolved();
    return ktUtils.property(this.handleVariableName(handle), async ({startIndent}) => {
      return ktUtils.applyFun(`Handle`, [
        await this.createStorageKey(handle),
        await generateHandleType(handle.type.resolvedType()),
        annotationsToKotlin(handle.annotations)
      ], {startIndent});
    }, {delegate: 'lazy'});
  }

  /** Generates a Kotlin `Plan.Particle` instantiation from a Particle. */
  async createParticle(particle: Particle): Promise<string> {
    const spec = particle.spec;
    let location = (spec && (spec.implBlobUrl || spec.implFile)) || '';
    if (!location && spec.connections.some(hc => hc.expression)) {
      location = 'arcs.core.data.expression.EvaluatorParticle';
    }
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

    const handle = this.handleVariableName(connection.handle);
    const mode = this.createHandleMode(connection.direction, connection.type);
    const type = await generateConnectionType(connection, {namespace: this.namespace});
    const annotations = annotationsToKotlin(connection.handle.annotations);
    const args = [handle, mode, type, annotations];
    if (connection.spec.expression) {
      args.push(ktUtils.applyFun('PaxelParser.parse', [multiLineQuote(connection.spec.expression)]));
    }

    return ktUtils.applyFun('HandleConnection', args, {startIndent: 24});
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

  fileHeader(): string {
    return `\
/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package ${this.namespace}

//
// GENERATED CODE -- DO NOT EDIT
//

${tryImport('arcs.core.data.*', this.namespace)}
${tryImport('arcs.core.data.expression.*', this.namespace)}
${tryImport('arcs.core.data.expression.Expression.*', this.namespace)}
${tryImport('arcs.core.data.expression.Expression.BinaryOp.*', this.namespace)}
${tryImport('arcs.core.data.Plan.*', this.namespace)}
${tryImport('arcs.core.storage.StorageKeyParser', this.namespace)}
${tryImport('arcs.core.util.ArcsInstant', this.namespace)}
${tryImport('arcs.core.util.ArcsDuration', this.namespace)}
${tryImport('arcs.core.util.BigInt', this.namespace)}
`;
  }

  fileFooter(): string {
    return ``;
  }
}
