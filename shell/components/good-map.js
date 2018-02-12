/*
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

const GoodMap = (() => {
  // resolves when window.__initGoodMap is called via JSONP protocol in dynamic script tag
  const callbackPromise = new Promise(resolve => window.__initGoodMap = resolve);
  // semaphore
  let initCalled;
  // api bootstrapping
  function loadGoogleMaps(apiKey) {
    if (!initCalled) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__initGoodMap`;
      document.head.appendChild(script);
      initCalled = true;
    }
    return callbackPromise;
  }
  // define custom element
  return class extends HTMLElement {
    static get observedAttributes() {
      return ['api-key', 'zoom', 'latitude', 'longitude', 'map-options'];
    }
    attributeChangedCallback(name, oldVal, val) {
      switch (name) {
        case 'api-key':
          this.apiKey = val;
          break;
        case 'zoom':
        case 'latitude':
        case 'longitude':
          this[name] = parseFloat(val);
          break;
        case 'map-options':
          this.extraOptions = JSON.parse(val);
          break;
      }
      if (this.map) {
        this.map.setOptions(this._constructMapOptions());
      }
    }
    constructor() {
      super();
      this.map = null;
      this.apiKey = null;
      this.zoom = null;
      this.latitude = null;
      this.longitude = null;
      this.extraOptions = {};
    }
    connectedCallback() {
      loadGoogleMaps(this.apiKey).then(() => {
        this.map = new google.maps.Map(this, this._constructMapOptions());
        this.dispatchEvent(new CustomEvent('google-map-ready', { detail: this.map }));
      });
    }
    _constructMapOptions() {
      let mapOptions = Object.assign({}, this.extraOptions);
      if (this.zoom) {
        mapOptions.zoom = this.zoom || 0;
      }
      if (this.latitude || this.longitude) {
        mapOptions.center = {
          lat: this.latitude || 0,
          lng: this.longitude || 0
        };
      }
      return mapOptions;
    }
  }
})();

// define custom element
customElements.define('good-map', GoodMap);
