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
import {Schema, FieldType} from '../types/lib-types.js';
import {KTExtracter} from './kotlin-refinement-generator.js';
import {assert} from '../platform/assert-web.js';
import {annotationsToKotlin} from './annotations-utils.js';
import {AnnotationRef} from '../runtime/arcs-types/annotation.js';

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
    refinementExpression = ${refinement},
    queryExpression = ${query}
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
        visitor({
          field,
          isCollection: true,
          schemaType: await getSchemaType(field, descriptor.getFieldType(), descriptor.annotations)
        });
        break;
      case 'schema-primitive':
      case 'kotlin-primitive':
      case 'schema-reference':
      case 'schema-nested':
        visitor({field, isCollection: false, schemaType: await getSchemaType(field, descriptor)});
        break;
      case 'schema-ordered-list':
        visitor({field, isCollection: false, schemaType: await getSchemaType(field, descriptor)});
        break;
      default:
        throw new Error(`Schema kind '${descriptor.kind}' for field '${field}' is not supported`);
    }
  }
}

async function getSchemaType(name: string, field: FieldType, extraAnn: AnnotationRef[] = []): Promise<string> {
  const fieldType = 'arcs.core.data.FieldType';
  const type = field.getType();
  const schema = field.getFieldType();
  const annotations = field.annotations.concat(extraAnn);
  if (field.isPrimitive) {
    switch (field.getType()) {
      case 'Text': return `${fieldType}.Text`;
      case 'URL': return `${fieldType}.Text`;
      case 'Number': return `${fieldType}.Number`;
      case 'BigInt': return `${fieldType}.BigInt`;
      case 'Boolean': return `${fieldType}.Boolean`;
      case 'Instant': return `${fieldType}.Instant`;
      case 'Duration': return `${fieldType}.Duration`;
      default: break;
    }
  } else if (field.isKotlinPrimitive) {
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
  } else if (field.isReference) {
    const kannotations = (annotations && annotations.length) ? ', ' + annotationsToKotlin(annotations) : '';
    return `${fieldType}.EntityRef(${quote(await schema.getEntityType().getEntitySchema().hash())}${kannotations})`;
  } else if (field.isNested) {
    return `${fieldType}.InlineEntity(${quote(await schema.getEntityType().getEntitySchema().hash())})`;
  } else if (field.isOrderedList) {
    assert(schema, 'innerType must be provided for Lists');
    return `${fieldType}.ListOf(${await getSchemaType(name, field.getFieldType(), field.annotations)})`;
  }

  throw new Error(`Schema kind '${field.kind}' for field '${name}' and type '${type}' is not supported`);
}

function generatePredicates(schema: Schema): {query: string, refinement: string} {
  const hasRefinement = !!schema.refinement;
  const hasQuery = hasRefinement && schema.refinement.getQueryParams().get('?');
  const expression = leftPad(KTExtracter.fromSchema(schema), 8);

  return {
    // TODO(cypher1): Support multiple queries.
    query: hasQuery ? `${expression}` : 'true.asExpr()',
    refinement: (hasRefinement && !hasQuery) ? `${expression}` : `true.asExpr()`
  };
}
