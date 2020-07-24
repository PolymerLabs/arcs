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
import {Schema} from '../runtime/schema.js';
import {KTExtracter} from './kotlin-refinement-generator.js';
import {assert} from '../platform/assert-web.js';

const ktUtils = new KotlinGenerationUtils();

/**
 * Generates a Kotlin schema instance.
 */
export async function generateSchema(schema: Schema): Promise<string> {
  if (schema.equals(Schema.EMPTY)) return `arcs.core.data.Schema.EMPTY`;

  const schemaNames = schema.names.map(n => `arcs.core.data.SchemaName("${n}")`);
  const {refinement, query} = generatePredicates(schema);

  const singletons: string[] = [];
  const collections: string[] = [];

  await visitSchemaFields(schema, ({isCollection, field, schemaType}) =>
      (isCollection ? collections : singletons).push(`"${field}" to ${schemaType}`));

  return `\
arcs.core.data.Schema(
    setOf(${ktUtils.joinWithIndents(schemaNames, {startIndent: 8})}),
    arcs.core.data.SchemaFields(
        singletons = ${leftPad(ktUtils.mapOf(singletons, 30), 8, true)},
        collections = ${leftPad(ktUtils.mapOf(collections, 30), 8, true)}
    ),
    ${quote(await schema.hash())},
    refinement = ${refinement},
    query = ${query}
)`;
}

interface SchemaField {
  field: string;
  isCollection: boolean;
  schemaType: string;
}

async function visitSchemaFields(schema: Schema, visitor: (field: SchemaField) => void) {
  for (const [field, descriptor] of Object.entries(schema.fields)) {
    switch (descriptor.kind) {
      case 'schema-collection':
        visitor({field, isCollection: true, schemaType: await getSchemaType(field, descriptor.schema)});
        break;
      case 'schema-primitive':
      case 'kotlin-primitive':
      case 'schema-reference':
      case 'schema-nested':
        visitor({field, isCollection: false, schemaType: await getSchemaType(field, descriptor)});
        break;
      case 'schema-ordered-list':
        visitor({field, isCollection: false, schemaType: await getSchemaType(field, {
          ...descriptor,
          innerType: await getSchemaType(field, descriptor.schema)
        })});
        break;
      default:
        throw new Error(`Schema kind '${descriptor.kind}' for field '${field}' is not supported`);
    }
  }
}

async function getSchemaType(field: string, {kind, schema, type, innerType}): Promise<string> {
  const fieldType = 'arcs.core.data.FieldType';
  if (kind === 'schema-primitive') {
    switch (type) {
      case 'Text': return `${fieldType}.Text`;
      case 'URL': return `${fieldType}.Text`;
      case 'Number': return `${fieldType}.Number`;
      case 'BigInt': return `${fieldType}.BigInt`;
      case 'Boolean': return `${fieldType}.Boolean`;
      default: break;
    }
  } else if (kind === 'kotlin-primitive') {
    switch (type) {
      case 'Byte': return `${fieldType}.Byte`;
      case 'Short': return `${fieldType}.Short`;
      case 'Int': return `${fieldType}.Int`;
      case 'Long': return `${fieldType}.Long`;
      case 'Char': return `${fieldType}.Char`;
      case 'Float': return `${fieldType}.Float`;
      case 'Double': return `${fieldType}.Double`;
      default: break;
    }
  } else if (kind === 'schema-reference') {
    return `${fieldType}.EntityRef(${quote(await schema.model.getEntitySchema().hash())})`;
  } else if (kind === 'schema-nested') {
    return `${fieldType}.InlineEntity(${quote(await schema.model.getEntitySchema().hash())})`;
  } else if (kind === 'schema-ordered-list') {
    assert(innerType, 'innerType must be provided for Lists');
    return `${fieldType}.ListOf(${innerType})`;
  }

  throw new Error(`Schema kind '${kind}' for field '${field}' and type '${type}' is not supported`);
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
