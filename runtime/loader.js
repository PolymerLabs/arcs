/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

var parser = require("./parser.js");
var fs = require("fs");
var recipe = require("./recipe.js");
var runtime = require("./runtime.js");
var assert = require("assert");

function locationFor(name, type) {
  return `../particles/${name}/${name}.${type}`
}

function loadParticle(name, arc) {
  let definition = loadDefinition(name);
  let clazz = require(locationFor(name, 'js'));

  // TODO looks like the particle swizzling should maybe happen inside arc.js
  // eventually.
  var rawParticle = new clazz(arc);
  rawParticle.setDefinition(definition);
  return rawParticle.arcParticle;
}

function loadDefinition(name) {
  let data = fs.readFileSync(locationFor(name, 'ptcl'), "utf-8");
  return parser.parse(data);
}

function loadRecipe(name) {
  let definition = loadDefinition(name);
  var builder = new recipe.RecipeBuilder();
  builder.addParticle(definition.type);
  for (var arg of definition.args) {
    // this is using a type name hack to "find" the right internal
    // type. We need to fix this at some point.
    builder.connect(arg.name, arg.type);
  }
  return builder.build();
}

Object.assign(exports, { loadParticle, loadDefinition, loadRecipe })
