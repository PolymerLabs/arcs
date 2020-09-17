/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Policy, PolicyField} from './policy.js';
import {Capability, Capabilities} from '../capabilities.js';
import {EntityType, Type, Schema, FieldType} from '../../types/lib-types.js';
import {Recipe, Handle, HandleConnection} from '../recipe/lib-recipe.js';
import {Dictionary} from '../../utils/lib-utils.js';

// Helper class for validating ingress fields and capabilities.
export class IngressValidation {
  private readonly capabilityByFieldPath = new Map<string, Capabilities[]>();

  constructor(public readonly policies: Policy[]) {
    for (const policy of this.policies) {
      for (const target of policy.targets) {
        const capabilities = target.toCapabilities();
        for (const field of target.fields) {
          this.initCapabilitiesMap([target.schemaName], field, capabilities);
        }
      }
    }
  }

  private initCapabilitiesMap(fieldPaths: string[], field: PolicyField, capabilities: Capabilities[]) {
    const paths = [...fieldPaths, field.name];
    if (field.subfields.length === 0) {
      this.addCapabilities(paths.join('.'), capabilities);
    }
    for (const subField of field.subfields) {
      this.initCapabilitiesMap(paths, subField, capabilities);
    }
  }

  private addCapabilities(fieldPath: string, capabilities: Capabilities[]) {
    if (!this.capabilityByFieldPath.has(fieldPath)) {
      this.capabilityByFieldPath.set(fieldPath, []);
    }
    this.capabilityByFieldPath.get(fieldPath).push(...capabilities);
  }

  getFieldCapabilities(fieldPath: string): Capabilities[]|undefined {
    return this.capabilityByFieldPath.get(fieldPath);
  }

  // Returns success, if all `create` handles in the recipe are declared with
  // capabilities that comply with the set of policies. Otherwise, returns a
  // combination of all encountered errors.
  validateIngressCapabilities(recipe: Recipe): IngressValidationResult {
    return IngressValidationResult.every(recipe,
        recipe.handles.filter(h => h.fate === 'create')
            .map(h => this.validateHandleCapabilities(h)));
  }

  // For the given handle's type, returns a map of all allowed Capabilities by
  // field name:
  // - If Handle's type is covered by the policy, all fields in the Handle's
  // type schema must be included in the policy.
  // - Otherwise the capabilities will be determined by capabilities of all the
  // Handles its data is derived from.
  private findHandleCapabilities(handle: Handle, capabilitiesByField: Map<string, Capabilities[]>, seenHandles = new Set<Handle>()): IngressValidationResult {
    assert(handle.type.maybeEnsureResolved({restrictToMinBound: true}));
    seenHandles.add(handle);
    if (this.policiesContainType(handle.type.resolvedType())) {
      const fieldPaths = this.collectSchemaFieldPaths(
        handle.type.resolvedType().getEntitySchema());
      for (const fieldPath of fieldPaths) {
        const fieldCapabilities = this.getFieldCapabilities(fieldPath);
        assert(fieldCapabilities, `Missing capabilities for ${fieldPath}`);
        if (!capabilitiesByField.has(fieldPath)) {
          capabilitiesByField.set(fieldPath, []);
        }
        capabilitiesByField.get(fieldPath).push(...fieldCapabilities);
      }
    } else {
      // All input connections of all particles writing into this handle.
      const sourceParticles = handle.connections.filter(conn => conn.isOutput)
          .map(conn => conn.particle);
      if (sourceParticles.length === 0) {
        return IngressValidationResult.failWith(handle,
            `Handle '${handle.id}' has no matching target type ` +
            `${handle.type.resolvedType().toString()} in policies, and no source particles.`);
      }
      const sourceConnections: HandleConnection[] = [];
      for (const sourceParticle of sourceParticles) {
        const particleInputs = Object.values(sourceParticle.connections)
            .filter(conn => conn.isInput && !seenHandles.has(conn.handle));
        if (particleInputs.length === 0) {
          return IngressValidationResult.failWith(handle,
              `Handle '${handle.id}' has no matching target type ` +
              `${handle.type.resolvedType().toString()} in policies, and ` +
              `contributing Particle ${sourceParticle.name} has no inputs.`);
        }
        sourceConnections.push(...particleInputs);
      }
      for (const sourceConn of sourceConnections) {
        const result = this.findHandleCapabilities(sourceConn.handle, capabilitiesByField);
        if (!result.success) {
          return result;
        }
      }
    }
    return IngressValidationResult.success(handle);
  }

  // Returns success, if the type of the handle, restricted according with the
  // set of policies, has capabilities that are compliant with the policies'
  // retention and maxAge permissions. Otherwise, returns a combination of all
  // encountered errors.
  private validateHandleCapabilities(handle: Handle): IngressValidationResult {
    const capabilitiesByField = new Map<string, Capabilities[]>();
    const result = this.findHandleCapabilities(handle, capabilitiesByField);
    if (!result.success) return result;
    // Iterate over all fields of the `handle` restricted type, and for each field
    // verify that at least one of the field's Capabilities (according to the
    // set of policies) allows ingress with the given `handle` Capabilities.
    for (const [fieldPath, fieldCapabilities] of capabilitiesByField.entries()) {
      const fieldResults = fieldCapabilities.map(
          fc => fc.isAllowedForIngress(handle.capabilities));
      if (!fieldResults.some(r => r.success)) {
        result.addResult(IngressValidationResult.failWith(handle,
            `Failed validating ingress for field '${fieldPath}' of Handle ` +
            `'${handle.id || handle.connections[0].getQualifiedName()}'`,
            fieldResults.filter(r => !r.success)));
      }
    }
    return result;
  }

  private collectSchemaFieldPaths(schema: Schema): string[] {
    const fieldPaths: string[] = [];
    for (const [fieldName, field] of Object.entries(schema.fields)) {
      fieldPaths.push(...this.collectFieldPaths(schema.name, fieldName, field));
    }
    return fieldPaths;
  }

  private collectFieldPaths(fieldPrefix: string, fieldName: string, field: FieldType): string[] {
    const fieldPaths = [];
    if (field.isPrimitive || field.isKotlinPrimitive) {
      fieldPaths.push(`${fieldPrefix}.${fieldName}`);
    } else if (field.getEntityType()) {
      for (const [subfieldName, subfield] of Object.entries(field.getEntityType().entitySchema.fields)) {
        fieldPaths.push(...this.collectFieldPaths([fieldPrefix, fieldName].join('.'), subfieldName, subfield));
      }
    } else {
      assert(`Unsupported field kind: ${field.kind}`);
    }
    return fieldPaths;
  }

  // Returns a type by the given name, combined from all corresponding type
  // restrictions provided by the given list of policies.
  private policiesContainType(type: Type): boolean {
    return this.policies.some(policy => policy.targets.some(
      target => target.schemaName === type.getEntitySchema().name));
  }

  // Get the max readable type for `typeName` according to the given `policies`.
  static getMaxReadType(typeName: string, policies: Policy[]): Type|null {
    const fields: Dictionary<FieldType> = {};
    let type = null;
    for (const policy of policies) {
      for (const target of policy.targets) {
        if (typeName === target.schemaName) {
          type = target.type;
          IngressValidation.mergeFields(typeName, fields, target.toSchemaFields());
        }
      }
    }
    return type ? EntityType.make([typeName], fields, type.getEntitySchema()) : null;
  }

  private static mergeFields(
    fieldPath: string,
    fields: Dictionary<FieldType>,
    newFields: Dictionary<FieldType>
  ) {
    for (const newFieldName of Object.keys(newFields)) {
      if (fields[newFieldName]) {
        IngressValidation.mergeField(
          fieldPath.concat(".", newFieldName),
          fields[newFieldName],
          newFields[newFieldName]);
      } else {
        fields[newFieldName] = newFields[newFieldName];
      }
    }
  }

  private static mergeField(
    fieldPath: string, field: FieldType, newField: FieldType
  ) {
    assert(field.kind === newField.kind,
           `Field '${fieldPath}' has incompatible type across policies: ` +
           `'${field.toString()}' vs '${newField.toString()}'`);
    const fieldEntityType = field.getEntityType();
    const newFieldEntityType = newField.getEntityType();
    if (fieldEntityType == null || newFieldEntityType == null) return;
    this.mergeFields(fieldPath,
                     fieldEntityType.entitySchema.fields,
                     newFieldEntityType.entitySchema.fields);
  }
}

export type IngressValidationResultKey = Recipe | Handle | Capability | Capabilities;

export class IngressValidationResult {
  public readonly results: IngressValidationResult[] = [];
  constructor(public readonly key: IngressValidationResultKey,
              public readonly errors: string[] = []) {}
  get success() {
    return this.errors.length === 0 && this.results.every(r => r.success);
  }
  addError(error: string) { this.errors.push(error); }

  addResult(result: IngressValidationResult) { this.results.push(result); }

  static success(key: IngressValidationResultKey): IngressValidationResult {
    return new IngressValidationResult(key);
  }

  static failWith(key: IngressValidationResultKey, error: string, results: IngressValidationResult[] = []): IngressValidationResult {
    const result = new IngressValidationResult(key, [error]);
    result.results.push(...results);
    return result;
  }

  // Returns successful result, if all results in the given list are a success.
  // Otherwise, returns a combination of all error results.
  static every(key: IngressValidationResultKey, results: IngressValidationResult[]): IngressValidationResult {
    const combined = new IngressValidationResult(key);
    for (const result of results) {
      if (!result.success) {
        combined.addResult(result);
      }
    }
    return combined;
  }

  toString(): string {
    if (this.success) {
      return 'Validation result: Success';
    }
    else {
      return `Validation result: Failure\n ${this.errorsToString('  ')}`;
    }
  }

  errorsToString(prefix: string = '') {
    return [
      ...this.errors.map(e => `${prefix}${e}`),
      ...this.results.map(r => r.errorsToString(`${prefix}  `))
    ].join('\n');
  }
}
