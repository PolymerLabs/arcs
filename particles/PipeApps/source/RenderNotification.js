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
    setHandles(handles) {
      this.output({
        modality: 'notification',
        title: `Hello`,
        text: `I'm a notification.`,
        taphandler: `onNotificationTap`,
        dismissHandler: `onNotificationDismiss`
      });
    }
    onNotificationTap(event) {
      this.output({
        modality: 'notification',
        title: `Tapped`,
        text: `Notification was tapped`
      });
    }
    onNotificationDismiss(event) {
      this.output({
        modality: 'notification',
        title: `Dismissed`,
        text: `Notification was dismissed`
      });
    }
  };
});
