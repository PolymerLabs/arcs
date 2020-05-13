/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Runtime} from '../runtime/runtime.js';
import {Recipe} from '../runtime/recipe/recipe.js';
import {Handle} from '../runtime/recipe/handle.js';
import {Particle} from '../runtime/recipe/particle.js';
import {Type, CollectionType, ReferenceType, SingletonType, TupleType} from '../runtime/type.js';
import {Schema} from '../runtime/schema.js';
import {HandleConnectionSpec, ParticleSpec} from '../runtime/particle-spec.js';
import {assert} from '../platform/assert-web.js';
import {findLongRunningArcId} from './storage-key-recipe-resolver.js';
import {Manifest} from '../runtime/manifest.js';
import {Capabilities} from '../runtime/capabilities.js';
import {CapabilityEnum, DirectionEnum, FateEnum, ManifestProto, PrimitiveTypeEnum} from './manifest-proto.js';
import {Refinement, RefinementExpressionLiteral} from '../runtime/refiner.js';
import {Op} from '../runtime/manifest-ast-nodes.js';
import {Claim, ClaimType} from '../runtime/particle-claim.js';

export async function encodeManifestToProto(path: string): Promise<Uint8Array> {
  const manifest = await Runtime.parseFile(path);

  if (manifest.imports.length) {
    throw Error('Only single-file manifests are currently supported');
  }
  return encodePayload(await manifestToProtoPayload(manifest));
}

export async function manifestToProtoPayload(manifest: Manifest) {
  return makeManifestProtoPayload(manifest.particles, manifest.recipes);
}

export async function encodePlansToProto(plans: Recipe[]) {
  const specMap = new Map<string, ParticleSpec>();
  for (const spec of [].concat(...plans.map(r => r.particles)).map(p => p.spec)) {
    specMap.set(spec.name, spec);
  }
  return encodePayload(await makeManifestProtoPayload([...specMap.values()], plans));
}

async function makeManifestProtoPayload(particles: ParticleSpec[], recipes: Recipe[]) {
  return {
    particleSpecs: await Promise.all(particles.map(p => particleSpecToProtoPayload(p))),
    recipes: await Promise.all(recipes.map(r => recipeToProtoPayload(r))),
  };
}

function encodePayload(payload: {}): Uint8Array {
  const error = ManifestProto.verify(payload);
  if (error) throw Error(error);
  return ManifestProto.encode(ManifestProto.create(payload)).finish();
}

async function particleSpecToProtoPayload(spec: ParticleSpec) {
  let claims = [];
  const connections = await Promise.all(spec.connections.map(async cs => {
    const directionOrdinal = DirectionEnum.values[cs.direction.replace(/ /g, '_').toUpperCase()];
    if (directionOrdinal === undefined) {
      throw Error(`Handle connection direction ${cs.direction} is not supported`);
    }
    const proto = {
      name: cs.name,
      direction: directionOrdinal,
      type: await typeToProtoPayload(cs.type)
    };
    const claimsProto = claimsToProtoPayload(cs, proto);
    if (claimsProto != null) {
      claims = claims.concat(claimsProto);
    }
    return proto;
  }));
  return {
    name: spec.name,
    location: spec.implFile,
    connections,
    claims
  };
}

// Converts the claims in HandleConnectionSpec.
function claimsToProtoPayload(cs: HandleConnectionSpec, proto: {}) {
  return cs.claims?.map(claim => {
    const accessPath = {handleConnection: cs.name};
    switch (claim.type) {
      case ClaimType.IsTag: {
        const tag = {semanticTag: claim.tag};
        let predicate;
        if (claim.isNot) {
          predicate = {
            not: {
              predicate: {
                label: tag
              }
            }
          };
        } else {
          predicate = {
            label: tag
          };
        }
        return {
          assume: {accessPath, predicate}
        };
      }
      case ClaimType.DerivesFrom: {
        return {
          derivesFrom: {
            target: accessPath,
            source: {handleConnection: claim.parentHandle.name}
          }
        };
      }
      default: return null;
    }
  }).filter(x => x != null);
}

async function recipeToProtoPayload(recipe: Recipe) {
  recipe.normalize();

  const handleToProtoPayload = new Map<Handle, {name: string}>();
  for (const h of recipe.handles) {
    handleToProtoPayload.set(h, await recipeHandleToProtoPayload(h));
  }

  return {
    name: recipe.name,
    arcId: findLongRunningArcId(recipe),
    particles: recipe.particles.map(p => recipeParticleToProtoPayload(p, handleToProtoPayload)),
    handles: [...handleToProtoPayload.values()],
  };
}

function recipeParticleToProtoPayload(particle: Particle, handleMap: Map<Handle, {name: string}>) {
  return {
    specName: particle.name,
    connections: Object.entries(particle.connections).map(
      ([name, connection]) => ({name, handle: handleMap.get(connection.handle).name})
    )
  };
}

async function recipeHandleToProtoPayload(handle: Handle) {
  const fateOrdinal = FateEnum.values[handle.fate.toUpperCase()];
  if (fateOrdinal === undefined) {
    throw Error(`Handle fate ${handle.fate} is not supported`);
  }

  return ({
    name: handle.localName || `handle${handle.recipe.handles.indexOf(handle)}`,
    id: handle.id,
    tags: handle.tags,
    fate: fateOrdinal,
    capabilities: capabilitiesToProtoOrdinals(handle.capabilities),
    storageKey: handle.storageKey && handle.storageKey.toString(),
    type: await typeToProtoPayload(handle.type || handle.mappedType)
  });
}

export function capabilitiesToProtoOrdinals(capabilities: Capabilities) {
  // We bypass the inteface and grab the underlying set of capability strings for the purpose of
  // serialization. It is rightfully hidden in the Capabilities object, but this use is justified.
  // Tests will continue to ensure we access the right field.
  // tslint:disable-next-line: no-any
  return [...(capabilities as any).capabilities].map(c => {
    const ordinal = CapabilityEnum.values[c.replace(/-/g, '_').toUpperCase()];
    if (ordinal === undefined) {
      throw Error(`Capability ${c} is not supported`);
    }
    return ordinal;
  });
}

export async function typeToProtoPayload(type: Type) {
  if (type.hasVariable && !type.isResolved()) {
    assert(type.maybeEnsureResolved());
    assert(type.isResolved());
  }
  type = type.resolvedType();
  switch (type.tag) {
    case 'Entity': {
      const entity = {
        entity: {
          schema: await schemaToProtoPayload(type.getEntitySchema()),
        }
      };
      if (type.getEntitySchema().refinement) {
        entity['refinement'] = refinementToProtoPayload(type.getEntitySchema().refinement);
      }
      return entity;
    }
    case 'Collection': return {
      collection: {
        collectionType: await typeToProtoPayload((type as CollectionType<Type>).collectionType)
      }
    };
    case 'Reference': return {
      reference: {
        referredType: await typeToProtoPayload((type as ReferenceType<Type>).referredType)
      }
    };
    case 'Tuple': return {
      tuple: {
        elements: await Promise.all((type as TupleType).innerTypes.map(typeToProtoPayload))
      }
    };
    case 'Singleton': return {
      singleton: {
        singletonType: await typeToProtoPayload((type as SingletonType<Type>).getContainedType())
      }
    };
    case 'Count': return {
      count: {}
    };
    // TODO(b/154733929)
    // case 'TypeVariable': return {
    //   variable: {
    //     name: (type as TypeVariable).variable.name,
    //   }
    // };
    default: throw Error(`Type '${type.tag}' is not supported.`);
  }
}

export async function schemaToProtoPayload(schema: Schema) {
  return {
    names: schema.names,
    fields: objectFromEntries(await Promise.all(Object.entries(schema.fields).map(
      async ([key, value]) => [key, await schemaFieldToProtoPayload(value)]))),
    hash: await schema.hash()
  };
}

type SchemaField = {
  kind: string,
  type: string,
  schema: SchemaField,
  types: SchemaField[],
  model: Type
};

async function schemaFieldToProtoPayload(fieldType: SchemaField) {
  switch (fieldType.kind) {
    case 'schema-primitive': {
      const primitive = PrimitiveTypeEnum.values[fieldType.type.toUpperCase()];
      if (primitive === undefined) {
        throw Error(`Primitive field type ${fieldType.type} is not supported.`);
      }
      return {primitive};
    }
    case 'schema-collection': {
      return {
        collection: {
          collectionType: await schemaFieldToProtoPayload(fieldType.schema)
        }
      };
    }
    case 'schema-reference': {
      return {
        reference: {
          referredType: await schemaFieldToProtoPayload(fieldType.schema)
        }
      };
    }
    case 'schema-inline': {
      return typeToProtoPayload(fieldType.model);
    }
    default: throw Error(`Schema field kind ${fieldType.kind} is not supported.`);
  }
}

function refinementToProtoPayload(refinement: Refinement): object {
  refinement.normalize();
  const literal = refinement.toLiteral();
  return refinementExpressionLiteralToProtoPayload(literal.expression);
}

function toOpProto(op: Op): number {
  const opEnum = [
    Op.AND, Op.OR,
    Op.LT, Op.GT, Op.LTE, Op.GTE,
    Op.ADD, Op.SUB, Op.MUL, Op.DIV,
    Op.NOT, Op.NEG,
    Op.EQ, Op.NEQ,
  ].indexOf(op);

  if (opEnum === -1) throw Error(`Op type '${op}' is not supported.`);

  return opEnum;
}

function refinementExpressionLiteralToProtoPayload(expr: RefinementExpressionLiteral): object {
  switch (expr.kind) {
    case 'BinaryExpressionNode': return {
      binary: {
        leftExpr: refinementExpressionLiteralToProtoPayload(expr.leftExpr),
        rightExpr: refinementExpressionLiteralToProtoPayload(expr.rightExpr),
        operator: toOpProto(expr.operator)
      }
    };
    case 'UnaryExpressionNode': return {
      unary: {
        expr: refinementExpressionLiteralToProtoPayload(expr.expr),
        operator: toOpProto(expr.operator),
      }
    };
    case 'FieldNamePrimitiveNode': return {
      field: expr.value
    };
    case 'QueryArgumentPrimitiveNode': return {
      queryArgument: expr.value
    };
    case 'NumberPrimitiveNode': return {
      number: expr.value
    };
    case 'BooleanPrimitiveNode': return {
      boolean: expr.value
    };
    case 'TextPrimitiveNode': return {
      text: expr.value
    };
    default:
      throw new Error(`Unknown node type ${expr['kind']}`);
  }
}

// Someday could be replace with Object.fromEntries when it's widely available:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries
function objectFromEntries(entries) {
  return entries.reduce((object, [key, value]) => {
    object[key] = value;
    return object;
  }, {});
}
