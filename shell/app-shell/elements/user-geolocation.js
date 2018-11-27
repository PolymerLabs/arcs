/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../../modalities/dom/components/xen/xen.js';

const log = Xen.logFactory('UserGeolocation', '#004f00');

const fallbackCoords = {latitude: 37.7610927, longitude: -122.4208173}; // San Francisco

class UserGeolocation extends Xen.Debug(Xen.Base, log) {
  _didMount() {
    this._watchGeolocation();
  }
  _watchGeolocation() {
    const fallback = () => this._maybeUpdateGeoCoords(fallbackCoords);
    // make sure some coords got set no matter what else occurs
    // TODO(sjmiles): calling fallback() right away may cause some unneeded thrash,
    // but otherwise tests can fail from lack of geocoords
    fallback();
    if ('geolocation' in navigator) {
      const update = ({coords}) => this._maybeUpdateGeoCoords(coords);
      navigator.geolocation.watchPosition(update, fallback, {timeout: 3000, maximumAge: Infinity});
    }
  }
  _maybeUpdateGeoCoords({latitude, longitude}) {
    const {geoCoords} = this._state;
    // Skip setting the position if it's the same as what we've already got.
    if (!geoCoords || geoCoords.latitude != latitude || geoCoords.longitude != longitude) {
      const coords = {latitude, longitude};
      this._setState({geoCoords: coords});
      this._fire('coords', coords);
    }
  }
}
customElements.define('user-geolocation', UserGeolocation);
