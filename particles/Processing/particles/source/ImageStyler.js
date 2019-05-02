/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html, log, resolver}) => {

  const template = html`

<div style="border: 1px solid silver; padding: 8px;">
  <div>Style transfer via <b>{{modelName}}</b><br></div>
  <div hidden="{{notWaiting}}" style="padding: 8px 0;">(no image)</div>
  <div hidden="{{notWorking}}">
    <div style="display: flex; height: 200px; width: 200px;">
      <img style="width: 64px; margin: auto; display: inline-block;" src="{{loadingGif}}">
    </div>
  </div>
  <img hidden="{{notDone}}" src="{{newImg}}">
  <!-- -->
  <image-styler imgurl="{{imageUrl}}" modelurl="{{modelUrl}}" on-results="onResults"></image-styler>
  <!-- -->
</div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({image}) {
      return Boolean(image);
    }
    render({image, model}, {status, newImg}) {
      const imageUrl = image ? resolver(image.url) : '';
      const modelUrl = model ? resolver(model.url) : '';
      const waiting = !status && !image;
      const working = !status && image;
      const loadingGif = working ? resolver('ImageStyler/../../assets/loading.png') : '';
      log(loadingGif);
      return {
        notWorking: !working,
        notWaiting: !waiting,
        notDone: !status,
        modelName: modelUrl.split('/').pop(),
        imageUrl,
        modelUrl,
        loadingGif,
        newImg: newImg || '',
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
