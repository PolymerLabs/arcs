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
    <div style="padding: 16px;">
     <button on-click="onClassify">Classify</button>
     <button on-click="onOther">Other</button>
      <br><br>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({imageToProcess}) {
      return !!imageToProcess;
    }
    render(props, state) {
      return state;
    }
    onClassify() {
      this.updateVariable('imageToClassify', {url: this.props.imageToProcess.url});
    }
    onOther() {
      console.log("onOther called");
      this.updateVariable('imageToOther', {url: this.props.imageToProcess.url});
    }
  };

});
