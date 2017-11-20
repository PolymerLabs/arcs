// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy} = require('../../strategizer/strategizer.js');
let RecipeWalker = require('../recipe/walker.js');
let Recipe = require('../recipe/recipe.js');
let RecipeUtil = require('../recipe/recipe-util.js');
let ViewMapperBase = require('./view-mapper-base.js');
let Schema = require('../schema.js');

let assert = require('../../platform/assert-web.js');

class AssignRemoteViews extends ViewMapperBase {
  constructor(arc) {
    super();
    this._arc = arc;
    this.fate = 'map';
  }

  getMappableViews(type, tags) {
    if (tags.length > 0) {
      return this._arc.context.findViewsByType(type, {tags});
    } else {
      return this._arc.context.findViewsByType(type);
    }
  }
}

module.exports = AssignRemoteViews;
