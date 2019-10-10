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

  return class extends UiParticle {
    // Base class default rendering includes {template, model}, which is
    // irrelevant for this particle's modality.
    // TODO: stop overriding this method, once default rendering is skipped for
    // undefined templates.
    shouldRender() {
      return false;
    }

    setHandles(handles) {
      this.output({
        modality: 'notification',
        title: `Hello`,
        text: `I'm a notification.`,
        handler: `onNotificationClick`
      });
    }

    onNotificationClick(event) {
      this.output({
        modality: 'notification',
        title: `Hello`,
        text: `Notification was clicked`
      });
    }
  };
});
