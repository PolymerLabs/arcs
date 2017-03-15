// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

var nextVariableID = 0;

function isRelation(t) {
  return Array.isArray(t);
}

function isView(t) {
  return (typeof t == "object" && t.tag == "list");
}

function isVariable(t) {
  return (typeof t == "object" && t.tag == "variable");
}

function primitiveType(t) {
  return isView(t) ? t.type : undefined;
}

function viewOf(t) {
  return {tag: "list", type: t};
}

function typeVariable() {
  return {tag: "variable", id: nextVariableID++};
}

Object.assign(module.exports, { isRelation, isView, isVariable, primitiveType, viewOf, typeVariable });