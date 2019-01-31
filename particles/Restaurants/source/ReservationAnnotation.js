// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html, log}) => {

  const template = html`

<style>
  [times] {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
  }
  [times] > button {
    width: 64px;
    height: 64px;
    padding: 0;
    color: #4fc9ff;
    background: white;
    border-radius: 50%;
    border: 3px solid #4fc9ff;
    font-size: 16px;
    font-weight: bold;
    -webkit-appearance: none;
    outline: none;
  }
  [times] > button:disabled {
    opacity: 0.7;
    color: #888;
    border-color: #888;
  }
</style>

<div reservation-annotation id={{subId}}>
  <div times>{{availableTimes}}</div>
</div>

<template available-times>
  <button disabled$={{notAvailable}}>{{time}}</button>
</template>
`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    update({restaurant, event, descriptions}) {
      let currentEvent = null;
      if (event && event.startDate && event.participants) {
        currentEvent = event.dataClone();
        if (this.handles.get('descriptions')) {
          this.setParticleDescription(this.getDescription(restaurant, currentEvent));
        }
      }
      this._setState({currentEvent});
    }
    toDateInputValue(date) {
      const local = new Date(date);
      local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return local.toJSON().slice(0, 16);
    }
    render({restaurant}, {currentEvent}) {
      if (restaurant && currentEvent) {
        return this.renderSingle(restaurant, currentEvent.startDate, parseInt(currentEvent.participants) || 2);
      }
    }
    renderSingle(restaurant, date, partySize) {
      const restaurantId = restaurant.id || '';
      const times = this.makeUpReservationTimes(restaurantId, partySize, date, 5);
      return {
        subId: restaurantId,
        availableTimes: {
          $template: 'available-times',
          models: times
        }
      };
    }
    getDescription(restaurant, currentEvent) {
      if (restaurant && currentEvent) {
        return this.createDescription(restaurant, currentEvent.participants, currentEvent.startDate);
      }
      return 'make reservations';
    }
    createDescription(restaurant, participants, startDate) {
      const times = this.makeUpReservationTimes(restaurant.id, participants, startDate, 5);
      let closest = null;
      times.map(({time, notAvailable}, i) => {
        if (!notAvailable) {
          if (!closest || i <= 2) {
            // 2 is the closest time to default time
            closest = time;
          }
        }
      });
      return closest
        ? `${restaurant.name} has a table for ${participants} available at ${closest}`
        : `no tables for ${participants} at ${restaurant.name} available within 2 hours`;
    }
    makeUpReservationTimes(id, partySize, date, n) {
      // Start at (n-1)/2 half hours before the desired reservation time
      const t = new Date(date);
      t.setMinutes(t.getMinutes() - (n-1)/2*30);
      let hour = (t.getHours()) % 24;
      let minute = t.getMinutes() >= 30 ? '30' : '00';
      // Seed per restaurant and day
      const seed = parseInt(id.substr(0, 8), 16);
      let ts = t.getTime();
      ts = ts - (ts % 86400000); // Round to closest day
      const result = [];
      while (n--) {
        // This seems somewhat balanced
        const notAvailable = Math.random() < 0.3; //(seed*(hour*2+minute/30)*(ts/86400000))%10 <= partySize;
        result.push({
          time: `${hour}:${minute}`,
          notAvailable
        });
        // Increment time slot
        if (minute == '30') {
          hour = (hour + 1) % 24;
          minute = '00';
        } else {
          minute = '30';
        }
      }
      return result;
    }
  };

});