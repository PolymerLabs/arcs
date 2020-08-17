/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Direction} from '../manifest-ast-types/enums.js';

export function connectionMatchesHandleDirection(connectionDirection: Direction, handleDirection: Direction): boolean {
  return acceptedDirections(connectionDirection).includes(handleDirection);
}

export function acceptedDirections(direction: Direction): Direction[] {
  // @param direction: the direction of a handleconnection.
  // @return acceptedDirections: the list of directions a handle can have that
  // are allowed with this handle connection.
  //
  switch (direction) {
    case 'any':
      return ['any', 'reads', 'writes', 'reads writes', 'hosts', '`consumes', '`provides'];
    case 'reads':
      return ['any', 'reads', 'reads writes', 'hosts', '`consumes'];
    case 'writes':
      return ['any', 'writes', 'reads writes', '`provides'];
    case 'reads writes':
      return ['any', 'reads writes'];
    case 'hosts':
      return ['any', 'hosts'];
    case '`consumes':
      return ['any', '`consumes'];
    case '`provides':
      return ['any', '`provides'];
    default:
      // Catch nulls and unsafe values from javascript.
      throw new Error(`Bad direction ${direction}`);
  }
}
