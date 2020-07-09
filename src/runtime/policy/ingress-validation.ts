/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PolicyTarget, Policy} from './policy.js';
import {Capability} from '../capabilities.js';

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
