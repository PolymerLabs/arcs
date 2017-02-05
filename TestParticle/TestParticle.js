"use strict";

var Particle = require("../runtime/particle.js").Particle;

class TestParticle extends Particle {

  dataUpdated() {
    this.bar = this.foo + 1;
    console.log(`dataUpdated. Foo: ${this.foo}. Set bar to ${this.bar}`);
    this.commitData();
  }
}

exports.TestParticle = TestParticle;
