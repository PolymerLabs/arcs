// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

import InnerPec from './inner-PEC.js';
import MessageChannel from './message-channel.js';
import Loader from './loader.js';

// TODO: Make this generic so that it can also be used in-browser, or add a
// separate in-process browser pec-factory.
export default function(id) {
  var channel = new MessageChannel();
  new InnerPec(channel.port1, `${id}:inner`, new Loader());
  return channel.port2;
};
