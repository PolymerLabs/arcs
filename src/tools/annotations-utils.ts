/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {AnnotationRef} from '../runtime/arcs-types/annotation.js';
import {quote, KotlinGenerationUtils} from './kotlin-generation-utils.js';

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

// Encode the annotations in a kotlin list of kotlin Annotation.
export function annotationsToKotlin(annotations: AnnotationRef[]): string {
  const ktUtils = new KotlinGenerationUtils();
  const annotationStrs: string[] = [];
  for (const ref of annotations) {
    const paramMappings = Object.entries(ref.annotation.params).map(([name, type]) => {
      const paramToMapping = () => {
        switch (type) {
          case 'Text':
              return `AnnotationParam.Str(${quote(ref.params[name].toString())})`;
          case 'Number':
            return `AnnotationParam.Num(${ref.params[name]})`;
          case 'Boolean':
            return `AnnotationParam.Bool(${ref.params[name]})`;
          default: throw new Error(`Unsupported param type ${type}`);
        }
      };
      return `"${name}" to ${paramToMapping()}`;
    });

    annotationStrs.push(ktUtils.applyFun('Annotation', [
      quote(ref.name),
      ktUtils.mapOf(paramMappings, 12)
    ]));
  }
  return ktUtils.listOf(annotationStrs);
}
