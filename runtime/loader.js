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
const schemaParser = require("./schema-parser.js");
var fs = require("fs");
var recipe = require("./recipe.js");
var runtime = require("./runtime.js");
var assert = require("assert");
var ParticleSpec = require("./particle-spec.js");
const Schema = require("./schema.js");

function particleLocationFor(name, type) {
  return `../particles/${name}/${name}.${type}`;
}

function entityLocationFor(name, type) {
  return `../entities/${name}.${type}`;
}

function schemaLocationFor(name) {
  return `../entities/${name}.schema`;
}

function loadParticle(name) {
  let definition = loadDefinition(name);
  let clazz = require(particleLocationFor(name, 'js'));
  clazz.spec = new ParticleSpec(definition);
  return clazz;
}

function loadDefinition(name) {
  let data = fs.readFileSync(particleLocationFor(name, 'ptcl'), "utf-8");
  return parser.parse(data);
}

function loadRecipe(name) {
  let definition = loadDefinition(name);
  return new ParticleSpec(definition).buildRecipe();
}

function loadEntity(name) {
  let clazz = loadSchema(name).entityClass();
  // let clazz = require(entityLocationFor(name, 'js'));
  return clazz;
}

function loadSchema(name) {
  let data = fs.readFileSync(schemaLocationFor(name), "utf-8");
  var parsed = schemaParser.parse(data);
  if (parsed.parent) {
    var parent = loadSchema(parsed.parent);
  } else {
    var parent = undefined;
  }
  return new Schema(parsed, parent);
}

Object.assign(exports, { loadParticle, loadDefinition, loadRecipe, loadEntity, loadSchema })
