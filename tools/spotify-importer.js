/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import fs from 'fs';
import {Manifest} from '../runtime/manifest.js';
import {Type} from '../runtime/ts-build/type.js';
import {StorageProviderFactory} from '../runtime/ts-build/storage/storage-provider-factory.js';
import {resetStorageForTesting} from '../runtime/ts-build/storage/firebase-storage.js';

// Imports Spotify playlists from JSON files, formatted as per the API
// described on https://developer.spotify.com/console/get-playlist

(async () => {
  let usage = 'Usage: importSpotify [--clear] <json-files>\n' +
              '       importSpotify --list';

  let baseUrl = 'firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/bigCollections';

  async function showPlaylists(collection) {
    let count = 0;
    let cursorId = await collection.stream(50);
    for (;;) {
      let {value, done} = await collection.cursorNext(cursorId);
      if (done) {
        console.log(`-- ${count} playlists`);
        return;
      }
      for (let item of value) {
        let m = item.artists && item.artists.match(/\|/g);
        console.log(`${item.name}: ${m ? (m.length + 1) : 0} artists`);
        count++;
      }
    }
  }

  async function importFiles(collection, paths) {
    let idBase = `!importer:${Date.now()}`;
    let index = 0;
    for (let path of paths) {
      let playlist;
      try {
        playlist = JSON.parse(fs.readFileSync(path, 'utf-8'));
      } catch (err) {
        console.error(`Error reading '${path}':`);
        console.error(err);
        continue;
      }

      let thumbnail;
      if (playlist.images && playlist.images.length > 0) {
        thumbnail = playlist.images[0].url;
      }

      let artists = [];
      if (playlist.tracks && playlist.tracks.items) {
        for (let item of playlist.tracks.items) {
          if (item.track) {
            for (let artist of item.track.artists) {
              if (artist.name) {
                artists.push(artist.name);
              }
            }
          }
        }
      }

      console.log(`${playlist.name}: ${artists.length} artists`);
      await collection.store({
        id: `${idBase}:${index}`,
        name: playlist.name,
        description: playlist.description,
        thumbnail,
        link: playlist.external_urls && playlist.external_urls.spotify,
        artists: artists.join('|')
      }, [`k${index}`]);
      index++;
    }
  }

  async function main() {
    let key = `${baseUrl}/playlists`;
    let manifest = await Manifest.parse(`
      schema Playlist
        Text name
        Text description
        URL thumbnail
        URL link
        Text artists  // '|'-separated list
    `);
    let PlaylistType = Type.newEntity(manifest.schemas.Playlist);
    let storage = new StorageProviderFactory('import');
    let construct = () => storage.construct('import', PlaylistType.bigCollectionOf(), key);
    let connect = () => storage.connect('import', PlaylistType.bigCollectionOf(), key);

    // First two entries in argv are the node binary and this file.
    let args = process.argv.slice(2);

    if (args[0] == '--list') {
      if (args.length == 1) {
        await showPlaylists(await connect());
      } else {
        console.error(usage);
      }
    } else if (args[0] == '--clear') {
      await resetStorageForTesting(key);
      let collection = await construct();
      if (args.length > 1) {
        await importFiles(collection, args.slice(1));
      }
    } else if (args.length > 0) {
      await importFiles(await connect(), args);
    } else {
      console.error(usage);
    }

    storage.shutdown();
  }

  console.log();
  await main();
  console.log();
  process.exit();
})();
