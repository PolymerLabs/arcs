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

class ViewIterator {
  constructor(view, current, high) {
    this.view = view;
    this.high = high;
    this.current = current;
  }

  next() {
    if (this.current >= this.high)
      return undefined;
    return this.view.data[this.current++];
  }
}

class View {
  constructor(type) {
    this.type = type;
    this.data = [];
    this.observers = [];
  }

  register(observer) {
    this.observers.push(observer);
    observer(new ViewIterator(this, 0, this.data.length));
  }

  store(item) {
    console.log("storing", item, "for", this.type);
    this.data.push(item);
    for (var observer of this.observers)
      observer(new ViewIterator(this, this.data.length - 1, this.data.length));
  }
} 

var views = {}

function viewFor(type) {
  if (views[type] == undefined) {
    console.log("constructing new view for", type);
    views[type] = new View(type);
  }
  return views[type];
}

exports.viewFor = viewFor;
