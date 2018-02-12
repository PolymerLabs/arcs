// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let host = `reservation-form`;

  let styles = `
<style>
  [${host}] {
    padding: 6px 0;
    text-align: center;
  }
  [${host}] > * {
    vertical-align: middle;
    padding: 6px 0;
  }
  [${host}] .x-select {
    display: inline-block;
    position: relative;
  }
  [${host}] .x-select::after {
    content: '▼';
    display: block;
    position: absolute;
    right: 8px;
    bottom: 8px;
    transform: scaleY(0.6);
    pointer-events: none;
  }
  [${host}] .x-select > select {
    position: relative;
    margin: 0;
    padding: 8px 24px 10px 6px;
    border: 0;
    border-bottom: 1px solid #ddd;
    background-color: transparent;
    border-radius: 0;
    font-size: 14px;
    font-weight: 300;
    overflow: hidden;
    outline: none;
    -webkit-appearance: none;
    vertical-align: top;
  }
  [${host}] input {
    padding: 6px;
    font-size: 14px;
    vertical-align: top;
    border: 0;
    background: transparent;
  }
  [${host}] input::-webkit-clear-button {
    display: none;
  }
  [${host}] [times] {
    display: flex;
    justify-content: space-around
  }
  [${host}] .x-button {
    display: inline-flex;
    align-items: center;
    position: relative;
    padding: 10px 16px;
    border-radius: 3px;
    -webkit-appearance: none;
    background-color: #4285f4;
    color: #fff;
    border: 0;
    outline: none;
  }
  [${host}] .x-button:disabled {
    opacity: 0.3;
  }
  [${host}] .x-button.raised {
    transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: 0.2s;
    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);
  }
  [${host}] .x-button.raised:active:not(:disabled) {
    box-shadow: 0 8px 17px 0 rgba(0, 0, 0, 0.2);
    transition-delay: 0s;
  }
</style>
  `;

  let template = `
${styles}
<div ${host} id={{subId}}>
  <div>{{timePicker}}</div>
  <div times>{{availableTimes}}</div>
</div>

<template time-picker>
  <div class="x-select">
    <select on-change="_onPartySizeChanged">
      <option value="1" selected$={{selected1}}>1 person</option>
      <option value="2" selected$={{selected2}}>2 people</option>
      ${[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
        .map(i => `<option value="${i}" selected$={{selected${i}}}>${i} people</option>`).join('')}
      <option value="21" selected$={{selected21}}>Larger party</option>
    </select>
  </div>
  <input type="datetime-local" value="{{date}}" on-change="_onDateChanged">
</template>

<template available-times>
  <button class="x-button raised" disabled$={{notAvailable}}>{{time}}</button>
</template>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props, state) {
      let event;

      if (!props.event || !props.event.startDate) {
        /* Default time selection:
         *  - if later than 10pm, book evening tomorrow
         *  - if earlier than 5pm, book this evening
         *  - round up to next half hour and set seconds to 0
         * 
         * (i.e. earliest can be 5:30pm and latest 10pm)
         */
        let when = new Date();

        if (when.getHours() >= 22) {
          when.setDate(when.getDate() + 1);
          when.setHours(19);
          when.setMinutes(0);
        } else if (when.getHours() < 17) {
          when.setHours(19);
          when.setMinutes(0);
        } else {
          when.setMinutes(when.getMinutes() + 15);
          when.setMinutes(when.getMinutes() > 30 ? 60 : 30);
        }
        when.setSeconds(0);
        when.setMilliseconds(0);

        const whenString = this.toDateInputValue(when);
        event = { startDate: whenString, endDate: whenString, participants: 2 };
      } else {
        event = Object.assign({}, props.event.rawData);
      }
      this._setState({ currentEvent: event });

      this.setParticleDescription(
        props.selected
          ? this.createDescription(props.selected.id, event.participants, event.startDate)
          : ""); // Default description

      if (!props.event || JSON.stringify(event) !== JSON.stringify(props.event.rawData)) {
        this._storeNewEvent(event);
      }
    }
    toDateInputValue(date) {
      let local = new Date(date);
      local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return local.toJSON().slice(0,16);
    }
    makeUpReservationTimes(id, partySize, date, n) {
      // Start at (n-1)/2 half hours before the desired reservation time
      let t = new Date(date);
      t.setMinutes(t.getMinutes() - (n-1)/2*30);
      let hour = (t.getHours()) % 24;
      let minute = t.getMinutes() >= 30 ? "30" : "00";

      // Seed per restaurant and day
      let seed = parseInt(id.substr(0, 8), 16);
      let ts = t.getTime();
      ts = ts - (ts % 86400000); // Round to closest day

      let result = [];

      while (n--) {
        // This seems somewhat balanced
        let notAvailable = (seed*(hour*2+minute/30)*(ts/86400000))%10 <= partySize;

        result.push({
          time: `${hour}:${minute}`,
          notAvailable
        });

        // Increment time slot
        if (minute == "30") {
          hour = (hour + 1) % 24;
          minute = "00";
        } else {
          minute = "30";
        }
      }

      return result;
    }
    createDescription(restaurantId, participants, startDate) {
      let times = this.makeUpReservationTimes(restaurantId, participants, startDate, 5);
      
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
        ? `Table for ${participants} available at ${closest}`
        : `No table for ${participants} available within 2 hours`;
    }
    _shouldRender(props, state) {
      return Boolean(state.currentEvent);
    }
    _render(props, state) {
      // TODO(noelutz): remove code that handles list rendering.
      // It has moved to ReservationAnnotation.js.
      const selectedRestaurant = props.selected;
      let partySize = parseInt(state.currentEvent.participants) || 2;
      if (selectedRestaurant) {
        return this._renderSingle(selectedRestaurant, state.currentEvent.startDate, partySize);
      }
    }
    _renderSingle(restaurant, date, partySize) {
      let restaurantId = restaurant.id || "";
      let times = this.makeUpReservationTimes(restaurantId, partySize, date, 5);
      let timePicker = {date};
      for (let i = 1; i <= 21; ++i) {
        timePicker[`selected${i}`] = Boolean(partySize == i);
      }
      return {
        subId: restaurantId,
        timePicker: {
          $template: 'time-picker',
          models: [timePicker]
        },
        availableTimes: {
          $template: 'available-times',
          models: times
        }
      }
    }
    _onDateChanged(e, state) {
      let newEvent = Object.assign({}, state.currentEvent || { participants: 2 });
      newEvent.startDate = newEvent.endDate = e.data.value;
      this._storeNewEvent(newEvent);
    }
    _onPartySizeChanged(e, state) {
      let newEvent = Object.assign({}, state.currentEvent || {});
      newEvent.participants = e.data.value;
      this._storeNewEvent(newEvent);
    }
    _storeNewEvent(newEvent) {
      const event = this._views.get('event');
      event.set(new event.entityClass(newEvent));
    }
  };

});
