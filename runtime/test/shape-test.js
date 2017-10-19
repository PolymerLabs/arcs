/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const assert = require('chai').assert;
const Shape = require('../shape.js');
const Type = require('../type.js');

describe('shape', function() {
  it('finds type variable references in views', function() {
    var shape = new Shape([{type: Type.newVariableReference('a')}], []);
    assert.equal(shape._typeVars.length, 1);
    assert(shape._typeVars[0].field == 'type');
    assert(shape._typeVars[0].object[shape._typeVars[0].field].variableReferenceName == 'a');
  });

  it('finds type variable references in slots', function() {
    var shape = new Shape([], [{name: Type.newVariableReference('a')}]);
    assert.equal(shape._typeVars.length, 1);
    assert(shape._typeVars[0].field == 'name');
    assert(shape._typeVars[0].object[shape._typeVars[0].field].variableReferenceName == 'a');
  });

  it('upgrades type variable references', function() {
    var shape = new Shape(
      [
        {name: Type.newVariableReference('a')},
        {type: Type.newVariableReference('b'), name: 'singleton'},
        {type: Type.newVariableReference('b').viewOf(), name: 'set'}
      ],
      [
        {name: Type.newVariableReference('a')},
      ]);
    assert.equal(shape._typeVars.length, 4);
    var type = Type.newShape(shape);
    var map = new Map();
    type = type.assignVariableIds(map);
    assert(map.has('a'));
    assert(map.has('b'));
    shape = type.shapeShape;
    assert(shape.views[0].name.variableId == shape.slots[0].name.variableId);
    assert(shape.views[1].type.variableId == shape.views[2].type.viewType.variableId);
  });
});
