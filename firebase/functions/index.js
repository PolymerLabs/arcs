// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const functions = require('firebase-functions');
const request = require('request-promise-native');
require('babel-polyfill');
const cors = require('cors')({origin: '*'});

/** transforms an object into a query string. */
function toQueryString(query) {
  return Object.entries(query).map(elem => elem.join('=')).join('&');
}

function proxyPlacesCall(url, req, res) {
  const placesKey = functions.config().places.key;
  const query = Object.assign({'key': placesKey}, req.query);
  const queryString = toQueryString(query);

  cors(
      req,
      res,
      () => request({uri: `${url}?${queryString}`, method: 'GET'}).pipe(res));
}

/** Proxy for the Places API */
exports.places = functions.https.onRequest((req, res) => {
  proxyPlacesCall(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      req,
      res);
});

/** Proxy for the Place Photos API */
exports.placePhotos = functions.https.onRequest((req, res) => {
  proxyPlacesCall(
      'https://maps.googleapis.com/maps/api/place/photo', req, res);
});

/** Proxy for the Place Photos API */
exports.placeDetails = functions.https.onRequest((req, res) => {
  proxyPlacesCall(
      'https://maps.googleapis.com/maps/api/place/details/json',
      req,
      res);
});
