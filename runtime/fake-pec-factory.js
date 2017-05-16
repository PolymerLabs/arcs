// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

const InnerPec = require('./inner-PEC.js');
const OuterPec = require('./outer-PEC.js');
const MessageChannel = require('./message-channel.js');

module.exports = function(loader, id) {
  var channel = new MessageChannel();
  // TODO: innerPec should have its own loader.
  new InnerPec(channel.port1, `${id}:inner`, loader);
  return new OuterPec(channel.port2, `${id}:outer`);
};
