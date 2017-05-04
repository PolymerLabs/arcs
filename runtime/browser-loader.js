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
var schemaParser = require("./schema-parser.js");
//var fs = require("fs");
//var recipe = require("../../runtime/recipe.js");
//var runtime = require("../../runtime/runtime.js");
//var assert = require("assert");
var ParticleSpec = require("./particle-spec.js");
var Schema = require("./schema.js");

// dynamic loading not so bueno under browserify ...
// preload these here so they:
// (1) are in the browserify bundle
// (2) have ids (paths) that browserify can resolve from this module
var _cp = require("../particles/Create/Create.js");
var _rp = require("../particles/Recommend/Recommend.js");
var _wp = require("../particles/WishlistFor/WishlistFor.js");
var _lv = require("../particles/ListView/ListView.js");
var _c = require("../particles/Chooser/Chooser.js");
var _mc = require("../particles/MultiChooser/MultiChooser.js");
//var _slp = require("../particles/StackingLayout/StackingLayout.js");
//

let fs = {
  readFileSync: name => {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', name, false);
    xhr.send();
    return xhr.responseText;
  }
};

function particleLocationFor(name, type) {
  return `../particles/${name}/${name}.${type}`;
}

function entityLocationFor(name, type) {
  return `../entities/${name}.${type}`;
}

function loadParticle(name) {
  let definition = loadDefinition(name);
  let clazz = require(particleLocationFor(name, 'js'));
  clazz.spec = new ParticleSpec(definition);
  return clazz;
}

function loadDefinition(name) {
  let data = fs.readFileSync('../' + particleLocationFor(name, 'ptcl'), "utf-8");
  return parser.parse(data);
}

function loadRecipe(name) {
  let definition = loadDefinition(name);
  return new ParticleSpec(definition).buildRecipe();
}

function loadEntity(name) {
  let clazz = loadSchema(name).entityClass();
  return clazz;
}

function loadSchema(name) {
  let data = fs.readFileSync('../' + entityLocationFor(name, 'schema'), "utf-8");
  var parsed = schemaParser.parse(data);
  if (parsed.parent) {
    var parent = loadSchema(parsed.parent);
  } else {
    var parent = undefined;
  }
  return new Schema(parsed, parent);
}

Object.assign(exports, { loadParticle, loadDefinition, loadRecipe, loadEntity })
