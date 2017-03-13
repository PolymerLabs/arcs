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
var ParticleSpec = require("./particle-spec.js");

function locationFor(name, type) {
  return `../particles/${name}/${name}.${type}`
}

function loadParticle(name) {
  let definition = loadDefinition(name);
  let clazz = require(locationFor(name, 'js'));
  clazz.spec = new ParticleSpec(definition);
  return clazz;
}

function loadDefinition(name) {
  let data = fs.readFileSync(locationFor(name, 'ptcl'), "utf-8");
  return parser.parse(data);
}

function loadRecipe(name) {
  let definition = loadDefinition(name);
  return new ParticleSpec(definition).buildRecipe();
}

Object.assign(exports, { loadParticle, loadDefinition, loadRecipe })
