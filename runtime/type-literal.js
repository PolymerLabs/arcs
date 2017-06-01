// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

var assert = require("assert");

var nextVariableID = 0;

function isRelation(t) {
  return Array.isArray(t);
}

function isView(t) {
  return (typeof t == "object" && t.tag == "list");
}

function isNamedVariable(t) {
  return (typeof t == "object" && t.tag == "prevariable");
}

function isVariable(t) {
  return (typeof t == "object" && t.tag == "variable");
}

// TODO: clauses for relations too 
function hasVariable(t) {
  return isVariable(t) || (isView(t) && hasVariable(primitiveType(t)));
}

function primitiveType(t) {
  return isView(t) ? t.type : undefined;
}

function viewOf(t) {
  return {tag: "list", type: t};
}

function namedTypeVariable(name) {
  return {tag: "prevariable", name}
}

function typeVariable(name) {
  var type = {tag: "variable", id: nextVariableID++, name};
  type.clone = () => { return { tag: "variable", id: type.id, name} };
  return type;
}

function variableID(t) {
  assert(isVariable(t));
  return t.id;
}

function convertNamedVariablesToVariables(variable, typeMap) {
  if (isView(variable)) {
    return viewOf(convertNamedVariablesToVariables(primitiveType(variable), typeMap));
  }
  if (isRelation(variable)) {
    return variable.map(a => convertNamedVariablesToVariables(a, typeMap));
  }

  if (isNamedVariable(variable)) {
    var id = typeMap.get(variable.name);
    if (id == undefined) {
      id = typeVariable(variable.name);
      typeMap.set(variable.name, id);
    }
    return id.clone();
  }

  return variable;
}

// TODO: we can do better than this. 
function equal(t1, t2) {
  return stringFor(t1) == stringFor(t2);
}

function stringFor(t) {
  if (isRelation(t))
    return t.toString();
  else if (isView(t))
    return `${stringFor(primitiveType(t))} List`;
  else if (isVariable(t) || isNamedVariable(t))
    return `[${t.name}]`;
  if (typeof t == "object")
    return JSON.stringify(t);
  return String(t);
}


Object.assign(module.exports, { isRelation, isView, isNamedVariable, isVariable, primitiveType, viewOf,
                                namedTypeVariable, typeVariable, variableID, hasVariable,
                                convertNamedVariablesToVariables, stringFor, equal });
