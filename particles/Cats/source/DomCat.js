/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({SimpleParticle, html, resolver}) => {
    return class extends SimpleParticle {
        get template() {
            const notification = this.handles.get('notification');
            if (notification) {
                if (notification.triggered) {
                    return html`Today's cat is <span>{{name}}</span>! This cat is: <span>{{description}}</span>!`;
                }
            }
            return html``;
        }
        update({cat, notification}) {
            if (notification) {
                if (notification.triggered) {
                    return {name: cat.name, description: cat.description};
                }
            }
        }

    };
});