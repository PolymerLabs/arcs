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
import {generateConnectionType, generateType} from './kotlin-type-generator.js';
import {HandleConnection} from '../runtime/recipe/handle-connection.js';
import {Direction} from '../runtime/manifest-ast-nodes.js';
import {Handle} from '../runtime/recipe/handle.js';
import {AnnotationRef} from '../runtime/recipe/annotation.js';

const ktUtils = new KotlinGenerationUtils();

export class PlanGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanGeneratorError';
  }
}

/** Generates plan objects from resolved recipes. */
export class PlanGenerator {

  constructor(private resolvedRecipes: Recipe[], private namespace: string) {}

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
      const planValInit = `val ${recipe.name}Plan = `;
      const plan = planValInit + ktUtils.applyFun(`Plan`, [
        ktUtils.listOf(await Promise.all(recipe.particles.map(p => this.createParticle(p)))),
        ktUtils.listOf(recipe.handles.map(h => this.handleVariableName(h))),
        PlanGenerator.createAnnotations(recipe.annotations)
      ], {startIndent: planValInit.length});

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
    const valInit = `val ${this.handleVariableName(handle)} = `;
    return valInit + ktUtils.applyFun(`Handle`, [
      await this.createStorageKey(handle),
      await generateType(handle.type.resolvedType()),
      PlanGenerator.createAnnotations(handle.annotations)
    ], {startIndent: valInit.length});
  }

  /** Generates a Kotlin `Plan.Particle` instantiation from a Particle. */
  async createParticle(particle: Particle): Promise<string> {
    const spec = particle.spec;
    const location = (spec && (spec.implBlobUrl || spec.implFile)) || '';
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
    const type = await generateConnectionType(connection);
    const annotations = PlanGenerator.createAnnotations(connection.handle.annotations);

    return ktUtils.applyFun('HandleConnection', [handle, mode, type, annotations],
        {startIndent: 24});
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

  static createAnnotations(annotations: AnnotationRef[]): string {
    const annotationStrs: string[] = [];
    for (const ref of annotations) {
      const paramMappings = Object.entries(ref.annotation.params).map(([name, type]) => {
        const paramToMapping = () => {
          switch (type) {
            case 'Text':
                return `AnnotationParam.Str(${quote(ref.params[name].toString())})`;
            case 'Number':
              return `AnnotationParam.Num(${ref.params[name]})`;
            case 'Boolean':
              return `AnnotationParam.Bool(${ref.params[name]})`;
            default: throw new Error(`Unsupported param type ${type}`);
          }
        };
        return `"${name}" to ${paramToMapping()}`;
      });

      annotationStrs.push(ktUtils.applyFun('Annotation', [
        quote(ref.name),
        ktUtils.mapOf(paramMappings, 12)
      ]));
    }
    return ktUtils.listOf(annotationStrs);
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
${tryImport('arcs.core.data.Plan.*', this.namespace)}
${tryImport('arcs.core.storage.StorageKeyParser', this.namespace)}
${tryImport('arcs.core.entity.toPrimitiveValue', this.namespace)}
`;
  }

  fileFooter(): string {
    return ``;
  }
}
