/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let {parse} = require('../build/manifest-parser.js');
let assert = require('chai').assert;

describe('manifest parser', function() {
  it('can parse an empy manifest', () => {
    parse('');
  });
  it('can parse a trivial recipe', () => {
    parse(`recipe Recipe`);
  });
  it('can parse with indentation', () => {
    parse(`
    recipe Recipe`);
  });
  it('can parse recipes that map views', () => {
    parse(`
      recipe Thing
        map #someTag
        map 'some-id' #someTag`);
  });
  it('can parse recipes with with particles', () => {
    parse(`
      recipe Recipe
        SomeParticle
        #someTag`);
  });
  it('parse reipes that connect particles to views', () => {
    parse(`
      recipe Recipe
        SomeParticle
          a -> #something
          b <- #somethingElse
          * = SomeOtherParticle
          * -> SomeOtherParticle #someTag
          * -> SomeOtherParticle.param`);
  });
});
