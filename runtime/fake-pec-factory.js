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
const Loader = require('./loader.js');

// TODO: Make this generic so that it can also be used in-browser, or add a
// separate in-process browser pec-factory.
module.exports = function(loader, id) {
  var channel = new MessageChannel();
  new InnerPec(channel.port1, `${id}:inner`, new Loader());
  return new OuterPec(channel.port2, `${id}:outer`);
};
