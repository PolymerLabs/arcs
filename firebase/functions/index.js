// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const functions = require('firebase-functions');
const request = require('request-promise-native');

/** Proxy for the Places API */
exports.places = functions.https.onRequest((req, res) => {
  const {location, radius, type} = req.query;
  const placesKey = functions.config().places.key;

  const serviceUrl =
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

  return request({
           uri: `${serviceUrl}?location=${location}&radius=${radius}&type=${
               type}&key=${placesKey}`,
           method: 'GET',
           resolveWithFullResponse: true
         })
      .then(({statusCode, body}) => {
        res.status(statusCode).send(body);
      });
});

/** Proxy for the Place Photos API */
exports.placePhotos = functions.https.onRequest((req, res) => {
  const placesKey = functions.config().places.key;
  const query = Object.assign({'key': placesKey}, req.query);
  const queryString =
      Object.entries(query).map(elem => elem.join('=')).join('&');

  const serviceUrl = 'https://maps.googleapis.com/maps/api/place/photo';

  return request({
           uri: `${serviceUrl}?${queryString}`,
           method: 'GET',
           resolveWithFullResponse: true
         })
      .then(({statusCode, body}) => {
        res.status(statusCode).send(body);
      });
});
