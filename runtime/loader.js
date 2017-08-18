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

var fs = require("fs");
var assert = require("assert");
const particle = require("./particle.js");
const DomParticle = require("./dom-particle.js");
const vm = require('vm');

function schemaLocationFor(name) {
  return `../entities/${name}.schema`;
}

class Loader {
  path(fileName) {
    let path = fileName.replace(/[\/][^\/]+$/, '/')
    return path;
  }

  join(prefix, path) {
    // TODO(sjmiles): might need a more robust test here
    if (path[0] === '/' || path.slice(0, 4) === 'http') {
      return path;
    }
    return this.path(prefix) + path;
  }

  loadFile(file) {
    return new Promise((resolve, reject) => {
      fs.readFile(file, (err, data) => {
        if (err)
          reject(err);
        else
          resolve(data.toString('utf-8'));
      });
    });
  }

  async loadParticleClass(spec) {
    let clazz = await this.requireParticle(spec.implFile);
    clazz.spec = spec;
    return clazz;
  }

  async requireParticle(fileName) {
    let src = await this.loadFile(fileName);
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
