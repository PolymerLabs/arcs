// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

class Node {
}

class Edge {
}

class Connection extends Edge {
}

class Particle extends Node {
  get id() {} // Not resolved until we have an ID.
  get name() {}
  get tags() {}
  get providedSlots() {} // Slot*
  get consumedSlots() {} // SlotConnection*
  get parameters() {} // {parameter -> ViewConnection}
}

class View extends Node {
  // a resolved View has either an id or create=true
  get tags() {} // only tags owned by the view
  get type() {} // nullable
  get id() {}
  get create() {}
  get connections() {} // ViewConnection*
}

class ViewConnection extends Connection {
  get name() {} // Parameter name?
  get tags() {}
  get type() {}
  get direction() {} // in/out
  get view() {} // View?
  get particle() {} // never null
}

class SlotConnection extends Connection {
  // TODO: slot functors??
  get tags() {}
  get view() {} // ViewConnection?
  get direction() {} // provide/consume
  get formFactors() {} // string*
  get required() {} // bool
  get particle() {} // Particle? :: consumer/provider
  get slot() {} // Slot?
}

class Slot extends Node {
  get provider() {} // SlotConnection?
  get consumers() {} // SlotConnection*
}

class Recipe {
  get particles() {} // Particle*
  get views() {} // View*
  get slots() {} // Slot*
  get slotConnections() {} // SlotConnection*
  get viewConnections() {} // ViewConnection*
}
