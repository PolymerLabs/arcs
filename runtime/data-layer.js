/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

class View {
  constructor(type) {
    this.type = type;
    this.data = [];
    this.observers = [];
  }

  register(observer) {
    this.observers.push(observer);
    for (var data of this.data)
      observer(data);
  }

  store(item) {
    console.log("storing", item, "for", this.type);
    this.data.push(item);
    for (var observer of this.observers)
      observer(item);
  }
} 

if (global.views == undefined)
  global.views = {}
var views = global.views;

function viewFor(type) {
  if (views[type] == undefined) {
    console.log("constructing new view for", type);
    views[type] = new View(type);
  }
  return views[type];
}

exports.viewFor = viewFor;
