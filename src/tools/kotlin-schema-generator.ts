/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {KotlinGenerationUtils, leftPad, quote} from './kotlin-generation-utils.js';
import {SchemaNode} from './schema2graph.js';
import {Schema} from '../runtime/schema.js';
import {AddFieldOptions, SchemaDescriptorBase} from './schema2base.js';
import {KTExtracter} from './kotlin-refinement-generator.js';
import {escapeIdentifier, getTypeInfo} from './kotlin-codegen-shared.js';

const ktUtils = new KotlinGenerationUtils();

/**
 * Metadata about a field in a schema.
 */
export type KotlinSchemaField = AddFieldOptions & {
  type: string,
  decodeFn: string,
  defaultVal: string,
  schemaType: string,
  escaped: string,
  nullableType: string
};

/**
 * Composes and holds a list of KotlinSchemaField for a SchemaNode.
 */
export class KotlinSchemaDescriptor extends SchemaDescriptorBase {

  readonly fields: KotlinSchemaField[] = [];

  constructor(node: SchemaNode, private forWasm: boolean) {
    super(node);
    this.process();
  }

  addField(opts: AddFieldOptions) {
    if (opts.typeName === 'Reference' && this.forWasm) return;

    const typeInfo = getTypeInfo({name: opts.typeName, ...opts});
    const type = typeInfo.type;

    this.fields.push({
      ...opts,
      ...typeInfo,
      escaped: escapeIdentifier(opts.field),
      nullableType: type.endsWith('?') ? type : `${type}?`
    });
  }
}

/**
 * Generates a schema instance for a given KotlinSchemaDescriptor
 */
export function generateSchema(descriptor: KotlinSchemaDescriptor): string {
  const schema = descriptor.node.schema;
  if (schema.equals(Schema.EMPTY)) return `Schema.EMPTY`;

  const schemaNames = schema.names.map(n => `SchemaName("${n}")`);
  const {refinement, query} = generatePredicates(schema);

  function generateFieldMap(isCollection: boolean): string {
    const fieldPairs = descriptor.fields
        .filter(f => !!f.isCollection === isCollection)
        .map(({field, schemaType}) => `"${field}" to ${schemaType}`);
    return leftPad(ktUtils.mapOf(fieldPairs, 30), 8, true);
  }

  return `\
Schema(
    setOf(${ktUtils.joinWithIndents(schemaNames, {startIndent: 8})}),
    SchemaFields(
        singletons = ${generateFieldMap(false)},
        collections = ${generateFieldMap(true)}
    ),
    ${quote(descriptor.node.hash)},
    refinement = ${refinement},
    query = ${query}
)`;
}

function generatePredicates(schema: Schema): {query: string, refinement: string} {
  const hasRefinement = !!schema.refinement;
  const hasQuery = hasRefinement && schema.refinement.getQueryParams().get('?');
  const expression = leftPad(KTExtracter.fromSchema(schema), 8);

  return {
    // TODO(cypher1): Support multiple queries.
    query: hasQuery ? `{ data, queryArgs ->
${expression}
    }` : 'null',
    refinement: (hasRefinement && !hasQuery) ? `{ data ->
${expression}
    }` : `{ _ -> true }`
  };
}
