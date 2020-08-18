/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {KotlinGenerationUtils} from './kotlin-generation-utils.js';
import {SchemaGraph, SchemaNode} from './schema2graph.js';
import {HandleConnectionSpec} from '../runtime/arcs-types/particle-spec.js';
import {Type} from '../runtime/type.js';
import {HandleConnection} from '../runtime/recipe/handle-connection.js';
import {assert} from '../platform/assert-web.js';
import {generateSchema} from './kotlin-schema-generator.js';

const ktUtils = new KotlinGenerationUtils();

export type CodeGenContext = {
  namespace?: string
};

/**
 * Generates a Kotlin type instance for the given handle connection.
 */
export async function generateConnectionType(connection: HandleConnection, context: CodeGenContext = {}): Promise<string> {
  return generateConnectionSpecType(connection.spec, new SchemaGraph(connection.particle.spec).nodes, context);
}

export async function generateConnectionSpecType(connection: HandleConnectionSpec, nodes: SchemaNode[], context: CodeGenContext = {}): Promise<string> {
  return generateType(maybeWrapInSingleton(connection.type), type => {
    if (!type.isEntity) return null;
    if (connection.type.hasVariable) return null;
    const node = nodes.find(n => n.schema.equals(type.getEntitySchema()));
    let schemaReference = `${node.fullName(connection)}.SCHEMA`;
    if (node.particleSpec.manifestNamespace && node.particleSpec.manifestNamespace !== context.namespace) {
      schemaReference = `${node.particleSpec.manifestNamespace}.${schemaReference}`;
    }
    return ktUtils.applyFun('arcs.core.data.EntityType', [schemaReference]);
  });
}

/**
 * Generates a Kotlin type instance for suitable to be used as a handle type.
 */
export async function generateHandleType(type: Type): Promise<string> {
  return generateType(maybeWrapInSingleton(type));
}

function maybeWrapInSingleton(type: Type): Type {
  if (type.isEntity || type.isReference || type.isVariable) {
    // Moving to the new style types with explicit singleton.
    return type.singletonOf();
  }
  return type;
}

/**
 * Generates a Kotlin representation of an Arcs type.
 *
 * @param overrideFunction optional lambda that allows overriding type generation at any place in the type hierarchy.
 */
export async function generateType(type: Type, overrideFunction: (type: Type) => string | null = _ => null): Promise<string> {
  return (async function generate(type: Type): Promise<string> {
    const pkg = 'arcs.core.data';
    const override = overrideFunction(type);
    if (override != null) {
      return override;
    } else if (type.isEntity) {
      return ktUtils.applyFun(`${pkg}.EntityType`, [await generateSchema(type.getEntitySchema())]);
    } else if (type.isVariable) {
      assert(type.maybeEnsureResolved(), 'Unresolved type variables are not currently supported');
      return generate(type.resolvedType());
    } else if (type.isCollection) {
      return ktUtils.applyFun(`${pkg}.CollectionType`, [await generate(type.getContainedType())]);
    } else if (type.isSingleton) {
      return ktUtils.applyFun(`${pkg}.SingletonType`, [await generate(type.getContainedType())]);
    } else if (type.isReference) {
      return ktUtils.applyFun(`${pkg}.ReferenceType`, [await generate(type.getContainedType())]);
    } else if (type.isTuple) {
      return ktUtils.applyFun(`${pkg}.TupleType.of`, await Promise.all(type.getContainedTypes().map(t => generate(t))));
    } else {
      throw new Error(`Type '${type.tag}' not supported as code generated handle connection type.`);
    }
  })(type);
}
