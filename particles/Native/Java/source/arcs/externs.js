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
 * @fileoverview provides externs definitions for
 * defineParticle() and related types
 */

/* eslint-disable no-var */

/**
 * @interface
 * @template PROPS,STATE
 */
var DomParticleInterface = function() {};

/** @type {!string} */
DomParticleInterface.prototype.template;

/** @param {STATE} state */
DomParticleInterface.prototype.setState = function(state) {};

/**
 * @param {STATE} state
 * @param {STATE} state
 */
DomParticleInterface.prototype.willReceiveProps = function(props, state) {};

/** @param {*} evt */
DomParticleInterface.prototype.click = function(evt) {};

/**
  @param {PROPS} props
  @param {STATE} state
  @return {STATE}
*/
DomParticleInterface.prototype.render = function(props, state) {};


/** @constructor
    @template PROPS,STATE
    @implements {DomParticleInterface<PROPS,STATE>} */
var DomParticle = function() {};

/** @override */
DomParticle.prototype.template;

/** @override */
DomParticle.prototype.state;

/** @override */
DomParticle.prototype.setState = function(state) {};

/** @override */
DomParticle.prototype.render = function(props, state) {};

/** @override */
DomParticle.prototype.willReceiveProps = function(props, state) {};

/**
 * @param {string} str
 */
var html = function(str) {};
var log;

/**
 * @record
 */
var Capabilities = function() {};


/**
 * @template PROPS, STATE
 * @function {!function(new:DomParticle<PROPS,STATE>)}
 */
Capabilities.prototype.DomParticle = function() {};

/**
 * @param {!string} str
 * @return {!string}
 */
Capabilities.prototype.html = function(str) {};

/**
 * @param {!string} str
 * @return {!void}
 */
Capabilities.prototype.log = function(str) {};


/**
 * @template PROPS,STATE
 * @param {!function(!Capabilities):!function(new:DomParticleInterface<PROPS,STATE>)} func
 * @externs
 * @return {void}
 */
var defineParticle = function(func) {};
