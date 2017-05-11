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

function schemaLocationFor(name) {
  return `../entities/${name}.schema`;
}

class Loader {
  constructor() {
    this._particlesByName = {};
  }

  loadFile(file) {
    return fs.readFileSync(file, "utf-8");
  }

  loadSchema(name) {
    let data = this.loadFile(schemaLocationFor(name));
    var parsed = schemaParser.parse(data);
    if (parsed.parent) {
      var parent = this.loadSchema(parsed.parent);
    } else {
      var parent = undefined;
    }
    return new Schema(parsed, parent);
  }

  loadEntity(name) {
    return this.loadSchema(name).entityClass();
  }

  registerParticle(particleClass) {
    assert(particleClass instanceof Function);
    if (this._particlesByName[particleClass.name])
      console.warn(`${particleClass.name} is already registered`);
    this._particlesByName[particleClass.name] = particleClass;
  }

  loadParticle(name) {
    let particleClass = this._particlesByName[name];
    if (particleClass) {
      return particleClass;
    }

    let data = this.loadFile(particleLocationFor(name, 'ptcl'));
    let definition = parser.parse(data);
    let clazz = this.requireParticle(name);
    clazz.spec = new ParticleSpec(definition);
    this._particlesByName[name] = clazz;
    return clazz;
  }
  requireParticle(name) {
    return require(particleLocationFor(name, 'js'));
  }
}

module.exports = Loader;
