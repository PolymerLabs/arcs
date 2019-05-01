/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html, log}) => {

  const tmpl = html`
  <h2>Neural Style Transfer</h2>
  <image-styler imgurl="{{url}}" modelurl="{{model}}" on-results="{{onResults}}"></image-styler>
  <div style="padding: 16px">
    <img src="{{newImg}}">
  </div>
  `;

  return class extends DomParticle {
    get template() {
      return tmpl;
    }

    render({image, model}, state) {
      return {
        status: state.status || (image ? 'transfering' : 'idle'),
        url: image ? image.url : '',
        model: model ? model.url : '',
        newImg: state.newImg ? state.newImg : '',
      };
    }

    onResults({data: {value}}) {
      this.setState({
        status: 'done',
        newImg: value.src,
      });
    }
  };
});
