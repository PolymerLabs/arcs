// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import RecipeWalker from '../recipe/walker.js';
import Recipe from '../recipe/recipe.js';
import RecipeUtil from '../recipe/recipe-util.js';
import HandleMapperBase from './handle-mapper-base.js';

import assert from '../../platform/assert-web.js';

export default class AssignRemoteHandles extends HandleMapperBase {
  constructor(arc) {
    super();
    this._arc = arc;
    this.fate = 'map';
  }

  getMappableHandles(type, tags=[]) {
    return this._arc.context.findStorageByType(type, {tags, subtype: true});
  }
}
