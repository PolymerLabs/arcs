/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html, resolver, log}) => {

  const template_ = html`
    <div style="padding: 16px;">
      <h3>Input an image url</h3>
      <input style="width: 80%; padding: 8px;" on-change="onChange" value="{{inputUrl}}">
      <br><br>
      <button on-click="onSubmit">Submit</button>
      <br><br>
      <img src="{{url}}">
      <br><br>
      <div slotid="imageView"></div>
    </div>
  `;

  const defaultImage = resolver(`ImageSelector/../../../Services/assets/waltbird.jpg`);

  return class extends DomParticle {
    get template() {
      return template_;
    }
    render(props, state) {
      if (!state.inputUrl) {
        state.inputUrl = defaultImage;
      }
      return state;
    }
    onChange({data: {value}}) {
      this.setState({inputUrl: value});
    }
    onSubmit() {
      const url = resolver(this.state.inputUrl);
      this.updateSingleton('image', {url});
      this.setState({url});
    }
  };

});
