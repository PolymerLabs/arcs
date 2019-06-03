/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../xen/xen.js';

const log = Xen.logFactory('UserGeolocation', '#004f00');

const fallbackCoords = {latitude: 37.7610927, longitude: -122.4208173}; // San Francisco

class Geolocation extends Xen.Debug(Xen.Base, log) {
  _getInitialState() {
    this._watchGeolocation();
  }
  _watchGeolocation() {
    const fallback = () => this._maybeUpdateGeoCoords(fallbackCoords);
    if ('geolocation' in navigator) {
      const update = ({coords}) => this._maybeUpdateGeoCoords(coords);
      navigator.geolocation.watchPosition(update, fallback, {timeout: 3000, maximumAge: Infinity});
    } else {
      fallback();
    }
  }
  _maybeUpdateGeoCoords({latitude, longitude}) {
    const {geoCoords} = this._state;
    // Skip setting the position if it's the same as what we've already got.
    if (!geoCoords || geoCoords.latitude != latitude || geoCoords.longitude != longitude) {
      const coords = {latitude, longitude};
      this.value = coords;
      this._setState({geoCoords: coords});
      this._fire('coords', coords);
    }
  }
}
customElements.define('geo-location', Geolocation);
