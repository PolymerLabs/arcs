// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = chai.assert;

afterEach(function() {
  target.innerHTML = '';
});

describe('GoodMap', function() {
  customElements.define('test-good-map', class extends GoodMap {
    constructor() {
      super();
      this._mapOptionsForTest = {};
    }
    connectedCallback() {
      this.map = {
        setOptions: options => {
          this._mapOptionsForTest = options;
        }
      }
    }
  });

  describe('#attributeChangedCallback', function() {
    it('should update GoogleMap options when attributes change', function() {
      const map = document.createElement('test-good-map');
      target.appendChild(map);

      map.setAttribute('map-options', '{"mapTypeId": "satellite"}');
      map.setAttribute('zoom', 15);

      assert.equal(
        JSON.stringify(map._mapOptionsForTest),
        JSON.stringify({mapTypeId: 'satellite', zoom: 15}));

      map.removeAttribute('map-options');
      map.setAttribute('latitude', -33.865);
      map.setAttribute('longitude', 151.209);

      assert.equal(
        JSON.stringify(map._mapOptionsForTest),
        JSON.stringify({zoom: 15, center: {lat: -33.865, lng: 151.209}}));
    });
  });
});
