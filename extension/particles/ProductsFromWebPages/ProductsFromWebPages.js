// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({Particle}) => {
  return class ProductsFromWebPages extends Particle {
    setViews(views) {
      console.log('ProductsFromWebPages setViews');
      this.on(views, 'list', 'change', e => {
        console.log('ProductsFromWebPages setViews.on callback');
        let webPagesInput = views.get('list');
        var productsOutput = views.get('products');

        webPagesInput.toList().then(function(input) {

          for (let c of input) {
            let ei = new productsOutput.entityClass({
                'image': c['image'],
                'name': c['name']
            });
            productsOutput.store(ei);
          }

          console.log('in closure done storing products', views.get('products'));
        });
      });
    }
  }
});
