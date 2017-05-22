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
const particle = require("./particle.js");
const DomParticle = require("./dom-particle.js");
const vm = require('vm');

function schemaLocationFor(name) {
  return `../entities/${name}.schema`;
}

class Loader {
  constructor() {
    this._particlesByName = {};
  }

  particleLocationFor(name, type) {
    return `../particles/${name}/${name}.${type}`;
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

  loadParticleSpec(name) {
    if (this._particlesByName[name])
      return this._particlesByName[name].spec;
    let data = this.loadFile(this.particleLocationFor(name, 'ptcl'));
    return new ParticleSpec(parser.parse(data));
  }

  // TODO: onlyRegisteredScript is a hack for inline particles. remove it.
  loadParticle(name, onlyRegisteredScript) {
    let particleClass = this._particlesByName[name];
    if (particleClass) {
      return particleClass;
    }

    let clazz = onlyRegisteredScript ? {name} : this.requireParticle(name);
    clazz.spec = this.loadParticleSpec(name);
    this._particlesByName[name] = clazz;
    return clazz;
  }

  requireParticle(name) {
    let filename = this.particleLocationFor(name, 'js');
    let src = this.loadFile(filename);
    // Note. This is not real isolation.
    let script = new vm.Script(src, {filename});
    let result = [];
    let self = {
      defineParticle(particleWrapper) {
        result.push(particleWrapper);
      },
      console,
    };
    script.runInNewContext(self);
    return this.unwrapParticle(result[0]);
  }

  unwrapParticle(particleWrapper) {
    return particleWrapper({particle, Particle: particle.Particle, DomParticle});
  }

}

module.exports = Loader;
