/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {AnnotationRef} from '../runtime/recipe/annotation.js';

export function annotationToProtoPayload(annotation: AnnotationRef) {
  return {
    name: annotation.name,
    params: Object.entries(annotation.params).map(([name, value]) => {
      const valueField = typeof value === 'string' ? 'strValue'
        : typeof value === 'number' ? 'numValue' : 'boolValue';
      return {name, [valueField]: value};
    })
  };
}
