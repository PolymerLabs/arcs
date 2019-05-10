#!/usr/bin/env -S node --experimental-modules --no-deprecation --loader=./tools/custom-loader.mjs -r source-map-support/register.js
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
import {Id} from '../runtime/id.js';
import {Manifest} from '../runtime/manifest.js';
import {EntityType} from '../runtime/type.js';
import {StorageProviderFactory} from '../runtime/storage/storage-provider-factory.js';
import {resetStorageForTesting} from '../runtime/storage/firebase/firebase-storage.js';
import '../runtime/storage/firebase/firebase-provider.js';
import '../runtime/storage/pouchdb-provider.js';

// Imports Spotify playlists from JSON files, formatted as per the API
// described on https://developer.spotify.com/console/get-playlist

void (async () => {
  const usage = 'Usage: importSpotify [--clear] <json-files>\n' +
              '       importSpotify --list';
  const schemaFile = 'particles/Music/Playlist.schema';
  const baseUrl = 'firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/bigCollections';

  async function showPlaylists(collection) {
    let count = 0;
    const cursorId = await collection.stream(50);
    for (;;) {
      const {value, done} = await collection.cursorNext(cursorId);
      if (done) {
        console.log(`-- ${count} playlists`);
        return;
      }
      for (const item of value) {
        const m = item.artists && item.artists.match(/\|/g);
        console.log(`${item.name}: ${m ? (m.length + 1) : 0} artists`);
        count++;
      }
    }
  }

  async function importFiles(collection, paths) {
    const idBase = `!importer:${Date.now()}`;
    let index = 0;
    for (const path of paths) {
      let playlist;
      try {
        playlist = JSON.parse(fs.readFileSync(path, 'utf-8'));
      } catch (err) {
        console.error(`Error reading '${path}':`);
        console.error(err);
        continue;
      }

      let description = playlist.description.replace(/ (Cover:|Related:|Related lists:|Also see:).*/, '');
      description = description.replace(/<[^>]+>/g, '');

      let thumbnail;
      if (playlist.images && playlist.images.length > 0) {
        thumbnail = playlist.images[0].url;
      }

      const artists = new Set();
      if (playlist.tracks && playlist.tracks.items) {
        for (const item of playlist.tracks.items) {
          if (item.track) {
            for (const artist of item.track.artists) {
              if (artist.name) {
                artists.add(artist.name);
              }
            }
          }
        }
      }

      console.log(`${playlist.name}: ${artists.size} artists`);
      await collection.store({
        id: `${idBase}:${index}`,
        name: playlist.name,
        description,
        thumbnail,
        link: playlist.external_urls && playlist.external_urls.spotify,
        artists: [...artists].join('|')
      }, [`k${index}`]);
      index++;
    }
  }

  async function main() {
    const key = `${baseUrl}/playlists`;
    let manifest;
    try {
      manifest = await Manifest.parse(fs.readFileSync(schemaFile, 'utf-8'));
    } catch (err) {
      console.error(`Error parsing '${schemaFile}':`);
      console.error(err);
      return;
    }

    const playlistType = new EntityType(manifest.schemas.Playlist);

    const id = Id.fromString('import');
    const storage = new StorageProviderFactory(id);
    const construct = () => storage.construct('import', playlistType.bigCollectionOf(), key);
    const connect = () => storage.connect('import', playlistType.bigCollectionOf(), key);

    // First two entries in argv are the node binary and this file.
    const args = process.argv.slice(2);

    if (args[0] === '--list') {
      if (args.length === 1) {
        await showPlaylists(await connect());
      } else {
        console.error(usage);
      }
    } else if (args[0] === '--clear') {
      await resetStorageForTesting(key);
      const collection = await construct();
      if (args.length > 1) {
        await importFiles(collection, args.slice(1));
      }
    } else if (args.length > 0) {
      await importFiles(await connect(), args);
    } else {
      console.error(usage);
    }

    await storage.shutdown();
  }

  console.log();
  await main();
  console.log();
  process.exit();
})();
