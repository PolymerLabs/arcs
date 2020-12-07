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
import {Recipe, Handle, Particle} from '../runtime/recipe/lib-recipe.js';
import {CollectionType, ReferenceType, SingletonType, TupleType, Type, TypeVariable, Schema,
        FieldType, Refinement, RefinementExpressionLiteral} from '../types/lib-types.js';
import {HandleConnectionSpec, ParticleSpec} from '../runtime/arcs-types/particle-spec.js';
import {Manifest} from '../runtime/manifest.js';
import {DirectionEnum, FateEnum, ManifestProto, PrimitiveTypeEnum} from './manifest-proto.js';
import {Op} from '../runtime/manifest-ast-types/manifest-ast-nodes.js';
import {ClaimType, CheckType} from '../runtime/arcs-types/enums.js';
import {CheckCondition, CheckExpression} from '../runtime/arcs-types/check.js';
import {flatMap} from '../utils/lib-utils.js';
import {Policy} from '../runtime/policy/policy.js';
import {policyToProtoPayload} from './policy2proto.js';
import {annotationToProtoPayload} from './annotations-utils.js';

export async function encodeManifestToProto(runtime, path: string): Promise<Uint8Array> {
  const manifest = await runtime.parseFile(path, {throwImportErrors: true});
  return encodePayload(await manifestToProtoPayload(manifest));
}

export async function manifestToProtoPayload(manifest: Manifest) {
  manifest.validateUniqueDefinitions();
  return makeManifestProtoPayload(manifest.allParticles, manifest.allRecipes, manifest.allPolicies);
}

export async function encodePlansToProto(plans: Recipe[], manifest: Manifest) {
  // In the recipe data structure every particle in a recipe currently has its own copy
  // of a particle spec. This copy is used in type inference and gets mutated as recipe
  // is type checked. As we need to encode particle specs without such mutations, below
  // we reach for ParticleSpecs from manifest.particles, instead of the ones hanging from
  // the recipe.particles.
  // This should be cleaned-up in the recipe data structure and type infrence code,
  // once that happens, we can remove the below hack.
  const specToId = (spec: ParticleSpec) => `${spec.name}:${spec.implFile}`;
  const planParticleIds = flatMap(plans, p => p.particles).map(p => specToId(p.spec));
  const particleSpecs = manifest.allParticles.filter(p => planParticleIds.includes(specToId(p)));

  return encodePayload(await makeManifestProtoPayload(particleSpecs, plans, /* policies= */ []));
}

async function makeManifestProtoPayload(particles: ParticleSpec[], recipes: Recipe[], policies: Policy[]) {
  return {
    particleSpecs: await Promise.all(particles.map(p => particleSpecToProtoPayload(p))),
    recipes: await Promise.all(recipes.map(r => recipeToProtoPayload(r))),
    policies: policies.map(policyToProtoPayload),
  };
}

function encodePayload(payload: {}): Uint8Array {
  const error = ManifestProto.verify(payload);
  if (error) throw new Error(error);
  return ManifestProto.encode(ManifestProto.create(payload)).finish();
}

async function particleSpecToProtoPayload(spec: ParticleSpec) {
  const connections = await Promise.all(spec.connections.map(async connectionSpec => handleConnectionSpecToProtoPayload(connectionSpec)));
  const claims = flatMap(spec.connections, connectionSpec => claimsToProtoPayload(spec, connectionSpec));
  const checks = flatMap(spec.connections, connectionSpec => checksToProtoPayload(spec, connectionSpec));

  return {
    name: spec.name,
    location: spec.implFile,
    connections,
    claims,
    checks,
    annotations: spec.annotations.map(a => annotationToProtoPayload(a)),
  };
}

async function handleConnectionSpecToProtoPayload(spec: HandleConnectionSpec) {
  const directionOrdinal = DirectionEnum.values[spec.direction.replace(/ /g, '_').toUpperCase()];
  if (directionOrdinal === undefined) {
    throw new Error(`Handle connection direction ${spec.direction} is not supported`);
  }
  return {
    name: spec.name,
    direction: directionOrdinal,
    type: await typeToProtoPayload(spec.type),
    expression: spec.expression
  };
}

// Converts the claims in HandleConnectionSpec.
function claimsToProtoPayload(
  spec: ParticleSpec,
  connectionSpec: HandleConnectionSpec
) {
  if (!connectionSpec.claims) {
    return [];
  }
  const protos: {}[] = [];
  for (const particleClaim of connectionSpec.claims) {
    const accessPath = accessPathProtoPayload(spec, connectionSpec, particleClaim.fieldPath);
    for (const claim of particleClaim.claims) {
      switch (claim.type) {
        case ClaimType.IsTag: {
          let predicate: {} = {label: {semanticTag: claim.tag}};
          if (claim.isNot) {
            predicate = {not: {predicate}};
          }
          protos.push({
            assume: {accessPath, predicate}
          });
          break;
        }
        case ClaimType.DerivesFrom: {
          protos.push({
            derivesFrom: {
              target: accessPath,
              source: accessPathProtoPayload(spec, claim.parentHandle, claim.fieldPath),
            }
          });
          break;
        }
        default:
          throw new Error(`Unknown ClaimType for claim: ${JSON.stringify(claim)}.`);
      }
    }
  }
  return protos;
}

// Converts the checks in HandleConnectionSpec.
function checksToProtoPayload(
  spec: ParticleSpec,
  connectionSpec: HandleConnectionSpec,
) {
  if (!connectionSpec.checks) {
    return [];
  }
  return connectionSpec.checks.map(check => {
    const accessPath = accessPathProtoPayload(spec, connectionSpec, check.fieldPath);
    const predicate = checkExpressionToProtoPayload(check.expression);
    return {accessPath, predicate};
  });
}

function checkExpressionToProtoPayload(
  expression: CheckExpression
) {
  switch (expression.type) {
    case 'and': {
      const children = expression.children.map(child => {
        return checkExpressionToProtoPayload(child);
      });
      return children.reduce((acc, cur) => {
        return (acc == null)
          ? cur
          : {
            and: {
              conjunct0: acc,
              conjunct1: cur
            }
          };
      }, null);
    }
    case 'or': {
      const children = expression.children.map(child => {
        return checkExpressionToProtoPayload(child);
      });
      return children.reduce((acc, cur) => {
        return (acc == null)
          ? cur
          : {
            or: {
              disjunct0: acc,
              disjunct1: cur
            }
          };
      }, null);
    }
    default: {
      const condition = expression as CheckCondition;
      switch (condition.type) {
        case CheckType.HasTag: {
          const tag = {semanticTag: condition.tag};
          if (condition.isNot) {
            return {
              not: {predicate: {label: tag}}
            };
          } else {
            return {label: tag};
          }
        }
        case CheckType.Implication:
          return {
            implies: {
              antecedent: checkExpressionToProtoPayload(condition.antecedent),
              consequent: checkExpressionToProtoPayload(condition.consequent),
            },
          };
        case CheckType.IsFromHandle:
        case CheckType.IsFromOutput:
        case CheckType.IsFromStore:
          throw new Error(`Unsupported CheckType for check: ${JSON.stringify(condition)}.`);
        default:
          throw new Error(`Unknown CheckType for check: ${JSON.stringify(condition)}.`);
      }
    }
  }
}

/** Constructs an AccessPathProto payload. */
function accessPathProtoPayload(
    spec: ParticleSpec,
    connectionSpec: HandleConnectionSpec,
    fieldPath: string[]
) {
  const accessPath: {handle: {particleSpec: string, handleConnection: string}, selectors?: {field: string}[]} = {
    handle: {
      particleSpec: spec.name,
      handleConnection: connectionSpec.name
    }
  };
  if (fieldPath.length) {
    accessPath.selectors = fieldPath.map(field => ({field}));
  }
  return accessPath;
}

async function recipeToProtoPayload(recipe: Recipe) {
  recipe.normalize();

  const handleToProtoPayload = new Map<Handle, {name: string}>();
  for (const h of recipe.handles) {
    // After type inference which runs as a part of the recipe.normalize() above
    // all handle types are constrained type variables. We force these type variables
    // to their resolution by called maybeEnsureResolved(), so that handle types
    // are encoded with concrete types, instead of variables.
    if (h.type === undefined) {
      throw new Error(`Type of handle '${h.localName}' in recipe '${recipe.name}' could not be resolved.`);
    }
    h.type.maybeEnsureResolved();
    handleToProtoPayload.set(h, await recipeHandleToProtoPayload(h));
  }

  return {
    name: recipe.name,
    particles: await Promise.all(recipe.particles.map(p => recipeParticleToProtoPayload(p, handleToProtoPayload))),
    handles: [...handleToProtoPayload.values()],
    annotations: recipe.annotations.map(a => annotationToProtoPayload(a))
  };
}

async function recipeParticleToProtoPayload(particle: Particle, handleMap: Map<Handle, {name: string}>) {
  return {
    specName: particle.name,
    connections: await Promise.all(Object.entries(particle.connections).map(
      async ([name, connection]) => ({
        name,
        handle: handleMap.get(connection.handle).name,
        type: await typeToProtoPayload(connection.type)
      })
    ))
  };
}

async function recipeHandleToProtoPayload(handle: Handle) {
  const fateOrdinal = FateEnum.values[handle.fate.toUpperCase()];
  if (fateOrdinal === undefined) {
    throw new Error(`Handle fate ${handle.fate} is not supported`);
  }
  const toName = handle => handle.localName || `handle${handle.recipe.handles.indexOf(handle)}`;
  const handleData = {
    name: toName(handle),
    id: handle.id,
    tags: handle.tags,
    fate: fateOrdinal,
    type: await typeToProtoPayload(handle.type || handle.mappedType),
    annotations: handle.annotations.map(annotationToProtoPayload)
  };

  if (handle.storageKey) {
    handleData['storageKey'] = handle.storageKey.toString();
  }

  if (handle.fate === 'join' && handle.joinedHandles) {
    handleData['associatedHandles'] = handle.joinedHandles.map(toName);
  }

  return handleData;
}

export async function typeToProtoPayload(type: Type) {
  if (type.hasVariable && type.isResolved()) {
    // We encode the resolution of the resolved type variables directly.
    // This allows us to encode handle types and connection types directly
    // and only encode type variables where they are not yet resolved,
    // e.g. in particle specs of generic particles.
    type = type.resolvedType();
  }
  switch (type.tag) {
    case 'Entity': {
      const entity = {
        entity: {
          schema: await schemaToProtoPayload(type.getEntitySchema()),
        },
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
    case 'TypeVariable': {
      const constraintType = type.canReadSubset || type.canWriteSuperset;
      const name = {name: (type as TypeVariable).variable.name};
      const constraint = {constraint: {maxAccess: (type as TypeVariable).variable.resolveToMaxType || false}};
      if (constraintType) {
        constraint.constraint['constraintType'] = await typeToProtoPayload(constraintType);
      }
      return {variable: {...name, ...constraint}};
    }
    default: throw new Error(`Type '${type.tag}' is not supported.`);
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

async function schemaFieldToProtoPayload(fieldType: FieldType) {
  // TODO(b/162033274): factor this into schema-field.
  switch (fieldType.kind) {
    case 'schema-primitive':
    case 'kotlin-primitive':  {
      const primitive = PrimitiveTypeEnum.values[fieldType.getType().toUpperCase()];
      if (primitive === undefined) {
        throw new Error(`Primitive field type ${fieldType.getType()} is not supported.`);
      }
      return {primitive};
    }
    case 'schema-collection': {
      return {
        collection: {
          collectionType: await schemaFieldToProtoPayload(fieldType.getFieldType())
        }
      };
    }
    case 'schema-tuple': {
      return {
        tuple: {
          elements: await Promise.all(fieldType.getFieldTypes().map(schemaFieldToProtoPayload))
        }
      };
    }
    case 'schema-reference': {
      return {
        reference: {
          referredType: await schemaFieldToProtoPayload(fieldType.getFieldType())
        }
      };
    }
    case 'type-name': {
      return typeToProtoPayload(fieldType.getEntityType());
    }
    case 'schema-nested': {
      // Nested inlined entity. Wraps a 'schema-inline' object. Mark it as an
      // inline entity.
      const entityType = await schemaFieldToProtoPayload(fieldType.getFieldType());
      entityType.entity.inline = true;
      return entityType;
    }
    case 'schema-inline': {
      // Not actually a nested inline entity (if it were, it would be wrapped in
      // a schema-nested object), so just encode as a regular entity.
      return typeToProtoPayload(fieldType.getEntityType());
    }
    case 'schema-ordered-list': {
      return {
        list: {elementType: await schemaFieldToProtoPayload(fieldType.getFieldType())}
      };
    }
    // TODO(b/154947220) support schema-unions
    case 'schema-union':
    default: throw new Error(`Schema field kind ${fieldType.kind} is not supported.`);
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

  if (opEnum === -1) throw new Error(`Op type '${op}' is not supported.`);

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
