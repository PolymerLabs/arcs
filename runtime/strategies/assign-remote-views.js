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

let assert = require('assert');

class AssignRemoteViews extends ViewMapperBase {
  constructor(arc, context) {
    super();
    this.mappable = [];
    // TODO: do this properly
    var Person = new Schema({
      name: 'Person',
      sections: [],
    })
    var peopleViews = arc.findViews(Person.type.viewOf());
    var people = peopleViews.map(view => view.toList()).reduce((a,b) => a.concat(b), [])
        .map(a => a.rawData.name);
    let contextPeople = context.people || {};
    people.forEach(person => {
      this.mappable.push(...(contextPeople[person] || []));
    });
  }

  getMappableViews(type, tags) {
    if (tags.length > 0) {
      return this.mappable.map(arc => arc.findViews(type, {tag: tags[0]})).reduce((a,b) => a.concat(b), []);
    } else {
      return this.mappable.map(arc => arc.findViews(type)).reduce((a,b) => a.concat(b), []);
    }
  }
}

module.exports = AssignRemoteViews;
