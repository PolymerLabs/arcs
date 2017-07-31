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

var parser = require("./build/particle-parser.js");
const schemaParser = require("./build/schema-parser.js");
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

  path(fileName) {
    let path = fileName.replace(/[\/][^\/]+$/, '/')
    return path;
  }
  join(prefix, path) {
    prefix = this.path(prefix);
    return prefix + path;
  }

  particleLocationFor(name, type) {
    return `../particles/${name}/${name}.${type}`;
  }

  loadFile(file) {
    return fs.readFileSync(file, "utf-8");
  }

  // TODO: Remove this once schemas are only loaded from manifests.
  loadSchema(name) {
    let data = this.loadFile(schemaLocationFor(name));
    var parsed = schemaParser.parse(data);
    if (parsed.parent) {
      parsed.parent = this.loadSchema(parsed.parent).toLiteral();
    }
    return new Schema(parsed);
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

  // TODO: Remove this once particles are only loaded from manifests.
  loadParticleSpec(name) {
    if (this._particlesByName[name])
      return this._particlesByName[name].spec;
    let data = this.loadFile(this.particleLocationFor(name, 'ptcl'));
    let model = parser.parse(data);
    model.implFile = this.particleLocationFor(name, 'js');
    let resolveSchema = name => {
      return this.loadSchema(name);
    };
    return new ParticleSpec(model, resolveSchema);
  }

  loadParticleClass(spec) {
    let particleClass = this._particlesByName[spec.name];
    if (particleClass) {
      return particleClass;
    }

    let clazz = this.requireParticle(spec.implFile);
    clazz.spec = spec;
    this._particlesByName[spec.name] = clazz;
    return clazz;
  }

  requireParticle(fileName) {
    let src = this.loadFile(fileName);
    // Note. This is not real isolation.
    let script = new vm.Script(src, {fileName});
    let result = [];
    let self = {
      defineParticle(particleWrapper) {
        result.push(particleWrapper);
      },
      console,
      importScripts: s => null //console.log(`(skipping browser-space import for [${s}])`)
    };
    script.runInNewContext(self);
    return this.unwrapParticle(result[0]);
  }

  unwrapParticle(particleWrapper) {
    return particleWrapper({particle, Particle: particle.Particle, DomParticle});
  }

}

module.exports = Loader;
