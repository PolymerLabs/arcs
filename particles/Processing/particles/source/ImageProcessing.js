/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* global defineParticle */

defineParticle(({DomParticle, html, log}) => {

  const template = html`
    <image-processor url="{{url}}" on-results="{{onResults}}"></image-processor>
    <div hidden={{shouldHide}} style="padding: 16px;">
      <div>Status: <b>{{status}}</b></div>
      <div>Label: <b>{{label}}</b></div>
      <div>Confidence: <span>{{probability}}</span></div>
    </div>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({image}) {
      return !!image;
    }
    render({image}, {status, label, probability}) {
      return {
        status: status || (image ? 'classifying' : 'idle'),
        url: image ? image.url : '',
        label,
        probability,
        shouldHide: false
      };
    }
    onResults({data: {value}}) {
      this.setState({
        status: 'done',
        label: value.label,
        probability: value.probability
      });
    }
  };

});
