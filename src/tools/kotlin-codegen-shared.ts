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
import {SchemaNode, SchemaGraph} from './schema2graph.js';
import {HandleConnectionSpec} from '../runtime/particle-spec.js';
import {Type, TypeVariable} from '../runtime/type.js';
import {HandleConnection} from '../runtime/recipe/handle-connection.js';

const ktUtils = new KotlinGenerationUtils();

/**
 * Generates a Kotlin type instance for the given handle connection.
 */
export function generateConnectionType(connection: HandleConnection): string {
  return generateConnectionSpecType(connection.spec, new SchemaGraph(connection.particle.spec).nodes);
}

export function generateConnectionSpecType(connection: HandleConnectionSpec, nodes: SchemaNode[]): string {
  let type = connection.type;
  if (type.isEntity || type.isReference) {
    // Moving to the new style types with explicit singleton.
    type = type.singletonOf();
  }

  return (function generateType(type: Type): string {
    if (type.isEntity || type.isVariable) {
      const node = type.isEntity
        ? nodes.find(n => n.schema && n.schema.equals(type.getEntitySchema()))
        : nodes.find(n => n.variableName.includes((type as TypeVariable).variable.name));
      return ktUtils.applyFun('EntityType', [`${node.fullName(connection)}.SCHEMA`]);
    } else if (type.isCollection) {
      return ktUtils.applyFun('CollectionType', [generateType(type.getContainedType())]);
    } else if (type.isSingleton) {
      return ktUtils.applyFun('SingletonType', [generateType(type.getContainedType())]);
    } else if (type.isReference) {
      return ktUtils.applyFun('ReferenceType', [generateType(type.getContainedType())]);
    } else if (type.isTuple) {
      return ktUtils.applyFun('TupleType.of', type.getContainedTypes().map(t => generateType(t)));
    } else {
      throw new Error(`Type '${type.tag}' not supported as code generated handle connection type.`);
    }
  })(type);
}
