/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../runtime/manifest.js';
import {Arc} from '../runtime/arc.js';
import {Type} from '../runtime/ts-build/type.js';
import {StorageProviderFactory} from '../runtime/ts-build/storage/storage-provider-factory.js';
import {resetStorageForTesting} from '../runtime/ts-build/storage/firebase-storage.js';

// Console is https://firebase.corp.google.com/project/arcs-storage-test/database/arcs-storage-test/data/spotify-importer
const fbUrl = 'firebase://arcs-storage-test.firebaseio.com/AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8/spotify-importer';

(async () => {
  let key = `${fbUrl}/playlist-entries`;
  await resetStorageForTesting(key);  

  // Encode image an in Base64?
  let manifest = await Manifest.parse(`
    schema PlaylistEntry
      Text playlistTitle
      Text playlistImageUrl
      Text artist
      Text song
    `);

  let arc = new Arc({id: 'test'});
  let storage = new StorageProviderFactory(arc.id);
  let PlaylistEntryType = Type.newEntity(manifest.schemas.PlaylistEntry);
  let collection = await storage.construct('test0', PlaylistEntryType.bigCollectionOf(), key);

  // TBD: Iterate over Spotify data dump and write data asynchronously.
  await collection.store({
    id: 'id-0',
    playlistTitle: 'Electronica for Hacking',
    playlistImageUrl: 'TBD',
    artist: 'Isolée',
    song: 'Pillowtalk'
  }, ['k1']);

  process.exit();
})();
