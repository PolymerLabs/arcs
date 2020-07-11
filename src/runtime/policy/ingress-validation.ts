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

export class IngressValidation {
  static getRestrictedType(typeName: string, policies: Policy[]): Type|null {
    const fields = {};
    let type = null;
    for (const policy of policies) {
      for (const target of policy.targets) {
        if (typeName === target.schemaName) {
          type = target.type;
          IngressValidation.mergeFields(fields, target.getRestrictedFields());
        }
      }
    }
    return type ? EntityType.make([typeName], fields, type.getEntitySchema()) : null;
  }

  private static mergeFields(fields: {}, newFields: {}) {
    for (const newFieldName of Object.keys(newFields)) {
      if (fields[newFieldName]) {
        IngressValidation.mergeField(fields[newFieldName], newFields[newFieldName]);
      } else {
        fields[newFieldName] = newFields[newFieldName];
      }
    }
  }

  private static mergeField(field, newField) {
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
