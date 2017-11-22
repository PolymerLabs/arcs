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
import ViewMapperBase from './view-mapper-base.js';
import Schema from '../schema.js';

import assert from '../../platform/assert-web.js';

export default class CopyRemoteViews extends ViewMapperBase {
  constructor(arc) {
    super();
    this._arc = arc;
    this.fate = 'copy';
  }

  getMappableViews(type, tags) {
    if (tags.length > 0) {
      return this._arc.context.findViewsByType(type, {tags});
    } else {
      return this._arc.context.findViewsByType(type);
    }
  }
}
