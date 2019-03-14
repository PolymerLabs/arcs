/*
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// configure logging
import '../../lib/loglevel-web.js';

// optional
import '../../lib/pouchdb-support.js';
import '../../lib/firebase-support.js';
//import '../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js';
import '../../configuration/whitelisted.js';

// proper dependencies
import {Utils} from '../../lib/utils.js';
import {DevtoolsSupport} from '../../lib/devtools-support.js';
import {DomSlotComposer} from '../../lib/dom-slot-composer.js';

// usage:
//
// ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`)
// ShellApi.receiveEntity(`{"type": "com.google.android.apps.maps"}`)
//
// ShellApi.receiveEntity(`{"type": "com.music.spotify"}`)
//
// results returned via `DeviceClient.foundSuggestions(json)` (if it exists)

const version = `version: mar-14`;
const paths = {
  root: '../../..',
  // map: {
  //   'https://$build/': `../../lib/build/`,
  //   'https://$particles/': `../../../particles/`
  // }
};
const containers = {root}; /* global root */
const storageBase = `?storage=pouchdb://now-slaithkyyq.now.sh/sjmiles/`;
const identity = 'sjmiles';
const storage = `${storageBase}/${identity}/`;

console.log(version);

(async () => {
  // if remote DevTools are requested, wait for connect
  await DevtoolsSupport();
  // configure arcs environment
  Utils.init(paths.root, paths.map);
  // prepare rendering surface
  const composer = new DomSlotComposer({containers});
  // prepare context
  const context = Utils.parse('');
  //
  // spawn arc
  const arc = await Utils.spawn({id: 'users-arc', composer, context});
  console.log(arc);
  // conjure recipe
  const manifest = await Utils.parse(`
    import 'https://$particles/Arcs/Login.recipe'
  `);
  const recipes = manifest.findRecipesByVerb('login');
  const recipe = recipes && recipes[0];
  if (recipe) {
    if (recipe.normalize()) {
      await arc.instantiate(recipe);
    }
  }
})();

const spawnFeedsArc = async (composer, context, storage) => {
  const arc = await Utils.spawn({id: 'users-arc', composer, context, storage});
  // conjure recipe
  const manifest = await Utils.parse(`
    import 'https://$particles/Arcs/Feed.recipe'
  `);
  const recipe = manifest.findRecipesByVerb('feed').pop();
  if (recipe) {
    if (recipe.normalize()) {
      await arc.instantiate(recipe);
    }
  }
}