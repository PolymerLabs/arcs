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

/* global defineParticle */

defineParticle(({UiParticle, html, log}) => {

const template = html`
<div hidden="{{hidden}}">
    Today's cat is <span>{{name}}</span>! This cat is: <span>{{description}}</span>!
    <img src={{photo}} alt="cat" width="200">
</div>
`;

  return class extends UiParticle {
    get template() {
      return template;
    }
    render({cat}, {show}) {
      if (cat) {
        log(cat);
        return {
          hidden: !show,
          name: cat.name,
          description: cat.description,
          photo: cat.photo
        };
      }
    }
    renderModel(model) {
      if (!this.state.notified) {
        super.renderModel({
          modality: 'notification',
          text: `Today's Cat is ${model.name}`,
          onclick: 'onCatClick'
        });
        this.state = {notified: true};
      }
      super.renderModel(model);
    }
    onCatClick(e) {
      log('onCatClick: ', e);
      this.state = {show: true};
    }
  };

});


/*defineParticle(({SimpleParticle, html, resolver}) => {
    return class extends SimpleParticle {

        get template() {
            return 'Today\'s cat is <span>{{name}}</span>!';
        }
        render({cat}) {
            if (cat) {
                return {
                    name: cat.name,
                    description: cat.description
                };
            }
        }
    };
});*/