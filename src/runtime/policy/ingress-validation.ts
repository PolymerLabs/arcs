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
import {PolicyTarget, Policy, PolicyField} from './policy.js';
import {Capability, Capabilities} from '../capabilities.js';
import {Type, EntityType} from '../type.js';
import {Refinement} from '../refiner.js';
import {Schema} from '../schema.js';
import {Handle} from '../recipe/handle.js';
import {Recipe} from '../recipe/recipe.js';

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

  // Returns success, if the type of the handle, restricted according with the
  // set of policies, has capabilities that are compliant with the policies'
  // retention and maxAge permissions. Otherwise, returns a combination of all
  // encountered errors.
  private validateHandleCapabilities(handle: Handle): IngressValidationResult {
    assert(handle.type.maybeEnsureResolved());
    const result = IngressValidationResult.success(handle);
    const restrictedType = this.restrictType(handle.type.resolvedType());
    if (restrictedType) {
      const fieldPaths = [];
      for (const [fieldName, field] of Object.entries(restrictedType.getEntitySchema().fields)) {
        fieldPaths.push(
            ...this.collectFieldPaths(restrictedType.getEntitySchema().name, fieldName, field));
      }

      for (const fieldPath of fieldPaths) {
        const fieldCapabilities = this.getFieldCapabilities(fieldPath);
        assert(fieldCapabilities, `Missing capabilities for ${fieldPath}`);
        const fieldResults = fieldCapabilities.map(
            fc => fc.isAllowedForIngress(handle.capabilities));
        if (!fieldResults.some(r => r.success)) {
          result.addResult(IngressValidationResult.failWith(handle,
              `Failed validating ingress for field '${fieldPath}'` +
              ` of '${handle.id || handle.connections[0].getQualifiedName()}`,
              fieldResults.filter(r => !r.success)));
        }
      }
    } else {
      result.addError(
        `Handle '${handle.id}' has no matching target type ` +
            `${handle.type.resolvedType().toString()} in policies`);
    }
    return result;
  }

  private collectFieldPaths(fieldPrefix: string, fieldName: string, field) {
    const fieldPaths = [];
    switch (field.kind) {
      case 'kotlin-primitive':
      case 'schema-primitive':
        fieldPaths.push(`${fieldPrefix}.${fieldName}`);
        break;
      case 'schema-collection':
        for (const [subfieldName, subfield] of Object.entries(field.schema.schema.model.entitySchema.fields)) {
          fieldPaths.push(...this.collectFieldPaths([fieldPrefix, fieldName].join('.'), subfieldName, subfield));
        }
        break;
      case 'schema-reference': {
        for (const [subfieldName, subfield] of Object.entries(field.schema.model.entitySchema.fields)) {
          fieldPaths.push(...this.collectFieldPaths([fieldPrefix, fieldName].join('.'), subfieldName, subfield));
        }
        break;
      }
      default:
        assert(`Unsupported field kind: ${field.kind}`);
    }
    return fieldPaths;
  }

  // Returns an EntityType containing fields from the given `type` stripped
  // down to a subset of fields covered by the set of policies.
  restrictType(type: Type): Type|null {
    const fields = {};
    const restrictedType = this.getRestrictedType(type.getEntitySchema().name);
    if (!restrictedType) return null;
    for (const [fieldName, field] of Object.entries(type.getEntitySchema().fields)) {
      const policyField = restrictedType.getEntitySchema().fields[fieldName];
      if (policyField) {
        fields[fieldName] = this.restrictField(field, policyField);
      }
    }
    return EntityType.make([type.getEntitySchema().name], fields, type.getEntitySchema());
  }

  // Returns the given schema field striped down according to the set of policies.
  private restrictField(field, policyField) {
    assert(field.kind === policyField.kind);
    switch (field.kind) {
      case 'kotlin-primitive':
      case 'schema-primitive':
        return field;
      case 'schema-collection':
        return {kind: 'schema-collection', schema: this.restrictField(field.schema, policyField.schema)};
      case 'schema-reference': {
        const restrictedFields = {};
        for (const [subfieldName, subfield] of Object.entries(field.schema.model.entitySchema.fields)) {
          const policySubfield = policyField.schema.model.entitySchema.fields[subfieldName];
          if (policySubfield) {
            restrictedFields[subfieldName] = this.restrictField(subfield, policySubfield);
          }
        }
        return {kind: 'schema-reference', schema: {
            ...field.schema,
            model: {
              entitySchema: new Schema(field.schema.model.entitySchema.names, restrictedFields)
            }
        }};
      }
      default:
        assert(`Unsupported field kind: ${field.kind}`);
    }
  }

  // Returns a type by the given name, combined from all corresponding type
  // restrictions provided by the given list of policies.
  getRestrictedType(typeName: string) {
    const fields = {};
    let type: Type|null = null;
    for (const policy of this.policies) {
      for (const target of policy.targets) {
        if (typeName === target.schemaName) {
          type = target.type;
          this.mergeFields(fields, target.getRestrictedFields());
          break;
        }
      }
    }
    return type ? EntityType.make([typeName], fields, type.getEntitySchema()) : null;
  }

  private mergeFields(fields: {}, newFields: {}) {
    for (const newFieldName of Object.keys(newFields)) {
      if (fields[newFieldName]) {
        this.mergeField(fields[newFieldName], newFields[newFieldName]);
      } else {
        fields[newFieldName] = newFields[newFieldName];
      }
    }
  }

  private mergeField(field, newField) {
    assert(field.kind === newField.kind);
    switch (field.kind) {
      case 'schema-collection': {
        this.mergeFields(field.schema.schema.model.entitySchema.fields,
            newField.schema.schema.model.entitySchema.fields);
        break;
      }
      case 'schema-reference': {
        this.mergeFields(field.schema.model.entitySchema.fields,
            newField.schema.model.entitySchema.fields);
        break;
      }
      default:
        return;
    }
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
