/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// TODO: delete this file

var loader = require("./load-particle.js");
var data = require("./data-layer.js");
var coordinator = new (require("./coordinator.js").Coordinator);

data.viewFor("Foo").store("preloaded foo");

var TestParticle = loader.loadParticle("TestParticle", coordinator);
console.log(TestParticle);
coordinator.tick();

data.viewFor("Foo").store("a foo");
coordinator.tick();
