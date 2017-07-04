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
  it('parses an empy manifest', () => {
    parse('');
  });
  it('parses a trivial recipe', () => {
    parse(`recipe Recipe`);
  });
  it('parses with indentation', () => {
    parse(`
      recipe Recipe`);
  });
  it('parses recipes that map views', () => {
    parse(`
      recipe Thing
        map #someTag
        map 'some-id' #someTag`);
  });
  it('parses recipes with particles', () => {
    parse(`
      recipe Recipe
        SomeParticle
        #someTag`);
  });
  it('parses recipes that connect particles to views', () => {
    parse(`
      recipe Recipe
        SomeParticle
          a -> #something
          b <- #somethingElse
          * = SomeOtherParticle
          * -> SomeOtherParticle #someTag
          * -> SomeOtherParticle.param`);
  });
  it('parses trivial particles', () => {
    parse(`
      particle SomeParticle`);
  })
  it('parses recipes that name views and particles', () => {
    parse(`
      recipe Recipe
        SomeParticle as thing
        map #thing as anotherThing`);
  });
  it('parses recipes with recipe level connections', () => {
    parse(`
      recipe
        X -> Y
        X.a -> Y.a
        a = b
        a.a = b.b
        #tag <- #tag
        X.a #tag <- a.y`);
  });
});
