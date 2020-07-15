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

// Helper class for validating ingress fields and capabilities.
export class IngressValidation {
  private readonly capabilityByFieldPath = new Map<string, Capabilities[]>();
  private readonly restrictedTypeByName = new Map<string, Type>();

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

  getCapabilities(fieldPath: string[]): Capabilities[]|undefined {
    return this.capabilityByFieldPath.get(fieldPath.join('.'));
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

export class IngressValidationResult {
  readonly errors = new Map<PolicyTarget | Policy | Capability, string>();

  get success() { return this.errors.size === 0; }

  addError(key: PolicyTarget | Policy | Capability, error: string) {
    this.errors.set(key, error);
  }

  addResult(other) {
    other.errors.forEach((v, k) => this.errors.set(k, v));
  }

  static success() { return new IngressValidationResult(); }

  static failWith(key: PolicyTarget | Policy | Capability, error: string) {
    const result = new IngressValidationResult();
    result.addError(key, error);
    return result;
  }

  toString(): string {
    if (this.success) {
      return 'Validation result: Success';
    }
    else {
      return 'Validation result: Failure\n' + [...this.errors.values()].join('\n');
    }
  }
}
