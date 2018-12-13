// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Debug, logFactory as _logFactory} from '../../modalities/dom/components/xen/xen-debug.js';

const factory = Debug.Level < 1 ? () => () => {} : _logFactory;

export const logFactory = (...args) => factory(...args);
