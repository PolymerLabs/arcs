/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const Schemas = {
  PipeEntity: {
    tag: 'Entity',
    data: {
      names: ['PipeEntity'],
      fields: {
        id: 'Text',
        type: 'Text',
        name: 'Text',
        timestamp: 'Number',
        count: 'Number',
        source: 'Text',
      }
    }
  },
  Json: {
    tag: 'Entity',
    data: {
      names: ['Json'],
      fields: {
        json: 'Text'
      }
    }
  }
};
