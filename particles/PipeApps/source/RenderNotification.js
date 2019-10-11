/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({UiParticle, html, log}) => {

  const notification = {
    modality: 'notification',
    title: `Hello`,
    text: `I'm a notification.`,
    handler: `onNotificationClick`
  };

  const clickNotification = {
    modality: 'notification',
    title: `Hello`,
    text: `Notification was clicked`
  };

  return class extends UiParticle {
    renderOutput(inputs, state) {
      if (!state.notified) {
        state.notified = true;
        this.output(notification);
      }
      if (state.clicked) {
        state.clicked = false;
        this.output(clickNotification);
      }
    }
    onNotificationClick(event) {
      this.state = {clicked: true};
    }
  };
});
