/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import Shape from '../shape.js';
import Type from '../type.js';
import Manifest from '../manifest.js';


describe('shape', function() {
  it('finds type variable references in views', function() {
    var shape = new Shape([{type: Type.newVariableReference('a')}], []);
    assert.equal(shape._typeVars.length, 1);
    assert(shape._typeVars[0].field == 'type');
    assert(shape._typeVars[0].object[shape._typeVars[0].field].variableReference == 'a');
  });

  it('finds type variable references in slots', function() {
    var shape = new Shape([], [{name: Type.newVariableReference('a')}]);
    assert.equal(shape._typeVars.length, 1);
    assert(shape._typeVars[0].field == 'name');
    assert(shape._typeVars[0].object[shape._typeVars[0].field].variableReference == 'a');
  });

  it('upgrades type variable references', function() {
    var shape = new Shape(
      [
        {name: Type.newVariableReference('a')},
        {type: Type.newVariableReference('b'), name: 'singleton'},
        {type: Type.newVariableReference('b').setViewOf(), name: 'set'}
      ],
      [
        {name: Type.newVariableReference('a')},
      ]);
    assert.equal(shape._typeVars.length, 4);
    var type = Type.newInterface(shape);
    var map = new Map();
    type = type.assignVariableIds(map);
    assert(map.has('a'));
    assert(map.has('b'));
    shape = type.interfaceShape;
    assert(shape.views[0].name.variableId == shape.slots[0].name.variableId);
    assert(shape.views[1].type.variableId == shape.views[2].type.setViewType.variableId);
  });

  it('matches particleSpecs', async () => {
    let manifest = await Manifest.parse(`
        schema Test
        schema NotTest

        particle P
          P(in Test foo)

        particle Q
          Q(in Test foo, in Test foo, in Test foo)

        particle R
          R(out NotTest foo, in NotTest bar, out Test far)

        particle S
          S(in NotTest bar, out Test far, out NotTest foo)
      `);
      let type = Type.newEntity(manifest.schemas.Test);
      var shape = new Shape([{name: 'foo'}, {direction: 'in'}, {type}], []);
      assert(!shape._particleMatches(manifest.particles[0]));
      assert(shape._particleMatches(manifest.particles[1]));
      assert(shape._particleMatches(manifest.particles[2]));
      assert(shape._particleMatches(manifest.particles[3]));
  })
});
