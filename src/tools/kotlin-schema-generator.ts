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
  if (schema.equals(Schema.EMPTY)) return `Schema.EMPTY`;

  const schemaNames = schema.names.map(n => `SchemaName("${n}")`);
  const {refinement, query} = generatePredicates(schema);

  const singletons: string[] = [];
  const collections: string[] = [];

  await visitSchemaFields(schema, ({isCollection, field, schemaType}) =>
      (isCollection ? collections : singletons).push(`"${field}" to ${schemaType}`));

  return `\
Schema(
    setOf(${ktUtils.joinWithIndents(schemaNames, {startIndent: 8})}),
    SchemaFields(
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
  if (kind === 'schema-primitive') {
    switch (type) {
      case 'Text': return 'FieldType.Text';
      case 'URL': return 'FieldType.Text';
      case 'Number': return 'FieldType.Number';
      case 'BigInt': return 'FieldType.BigInt';
      case 'Boolean': return 'FieldType.Boolean';
      default: break;
    }
  } else if (kind === 'kotlin-primitive') {
    switch (type) {
      case 'Byte': return 'FieldType.Byte';
      case 'Short': return 'FieldType.Short';
      case 'Int': return 'FieldType.Int';
      case 'Long': return 'FieldType.Long';
      case 'Char': return 'FieldType.Char';
      case 'Float': return 'FieldType.Float';
      case 'Double': return 'FieldType.Double';
      default: break;
    }
  } else if (kind === 'schema-reference') {
    return `FieldType.EntityRef(${quote(await schema.model.getEntitySchema().hash())})`;
  } else if (kind === 'schema-nested') {
    return `FieldType.InlineEntity(${quote(await schema.model.getEntitySchema().hash())})`;
  } else if (kind === 'schema-ordered-list') {
    assert(innerType, 'innerType must be provided for Lists');
    return `FieldType.ListOf(${innerType})`;
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
