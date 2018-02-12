// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle, resolver}) => {

  const html = (strings, ...values) => (strings[0]  + values.map((v, i) => v + strings[i+1]).join('')).trim();

  let host = `google-map`;

  let styles = html`
<style>
  [${host}] {
    display: block;
    height: 400px;
    display: flex;
  }
  [${host}] good-map {
    flex: 1;
  }
</style>
  `;

  let template = html`

${styles}

<div ${host}>
  <good-map
    api-key="AIzaSyCXI6QO-jc6lxFJM2VCb68R31mD2NAHmCs"
    latitude$="{{latitude}}"
    longitude$="{{longitude}}"
    zoom="14"
    map-options='{"mapTypeId": "satellite"}'></good-map>
</div>

  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render(props) {
      if (props.location) {
        const {latitude, longitude} = props.location;
        return {latitude, longitude};
      }
    }
  };

});
