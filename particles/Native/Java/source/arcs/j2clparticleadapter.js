/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

 /**
 * @fileoverview This exists right now to allow a J2clClass to be reparented to
 * DomParticle in a callback. J2cl's interop layer currently only supports *statically*
 * extending JS classes with the 'extends clause' which makes dynamic ES6 techniques like
 * extends Mixin(LocalVariableFoo) problematic.
 *
 * TODO: move this boilerplate into a bazel genrule/skylark rule so it is
 * generated automatically.
*/
goog.module('arcs.j2clparticle');
const J2clParticle = goog.require('arcs.J2clParticle');

/** 
 * @param {!Capabilities} Capabilities
 * @return {!function(new:DomParticleInterface)}
 */
const Particle = Capabilities => {
        /** @type {!function(new:DomParticleInterface)} */
        const DomParticle = Capabilities.DomParticle;
        class delegate extends J2clParticle {
            /* overrides methods in DomParticleBase and delegates
             * to those supplied by defineParticle */

            /** @override */
            getState() { return this.state; }

            /** @override */
            html(str) { return Capabilities.html([str]); }

            /** @override */
            log(str) { return Capabilities.log(str); }
        }

        // reparent J2ClParticle from "Object" to DomParticle       
        Reflect.setPrototypeOf(J2clParticle.prototype, DomParticle.prototype);
        Reflect.setPrototypeOf(J2clParticle, DomParticle);
        return delegate;
};

defineParticle(Particle);
