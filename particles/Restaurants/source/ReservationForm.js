/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, html}) => {

  const template = html`

<style>
  :host {
    padding: 16px;
  }
  [caption] {
    font-size: 14px;
    font-weight: 500;
    line-height: 14px;
    letter-spacing: .25px;
    opacity: .54;
    margin-bottom: 8px;
  }
  [time-picker] > div {
    display: flex;
    flex-direction: row;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    height: 56px;
    align-items: center;
  }
  [select] {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 116px;
    border-right: 1px solid rgba(0,0,0,.1);
  }
  [select]::after {
    content: '▼';
    display: block;
    position: absolute;
    right: 8px;
    transform: scaleY(0.4) scaleX(0.8);
    pointer-events: none;
  }
  [select] > select {
    margin: 0;
    padding: 0;
    border: 0;
    background-color: transparent;
    border-radius: 0;
    font-size: 16px;
    outline: none;
    -webkit-appearance: none;
  }
  input {
    padding: 0 0 0 16px;
    vertical-align: top;
    border: 0;
    background: transparent;
    font-family: 'Google Sans';
    font-size: 16px;
    line-height: 24px;
  }
  input::-webkit-clear-button {
    display: none;
  }
</style>

<div reservation-form id="{{subId}}">
  <div caption>Reservation Details</div>
  <div time-picker>{{timePicker}}</div>
  <div slotid="annotation"></div>
</div>

<template time-picker>
  <div>
    <div select>
      <select on-change="onPartySizeChanged">
        <option value="1" selected$={{selected1}}>For 1</option>
        <option value="2" selected$={{selected2}}>For 2</option>
        ${[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
          .map(i => `<option value="${i}" selected$={{selected${i}}}>For ${i}</option>`).join('')}
        <option value="21" selected$={{selected21}}>Larger party</option>
      </select>
    </div>
    <input type="datetime-local" value="{{date}}" on-change="onDateChanged">
  </div>
</template>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    update({event, restaurant}, state) {
      // prepare currentEvent
      const currentEvent = !event || !event.startDate ? this.initializeEvent() : Object.assign({}, event.rawData);
      // record it
      this.setState({currentEvent});
      // persist it, if needed
      if (!event || JSON.stringify(state.currentEvent) !== JSON.stringify(event.rawData)) {
        this.storeNewEvent(state.currentEvent);
      }
      // Default description
      //this.setParticleDescription(this.getDescription(restaurant, currentEvent));
    }
    shouldRender(props, {currentEvent}) {
      return Boolean(currentEvent);
    }
    render({restaurant}, {currentEvent}) {
      const partySize = parseInt(currentEvent.participants) || 2;
      return this.renderSingle(restaurant, currentEvent.startDate, partySize);
    }
    renderSingle(restaurant, date, partySize) {
      const restaurantId = (restaurant && restaurant.id) || '';
      const timePicker = {date};
      for (let i = 1; i <= 21; ++i) {
        timePicker[`selected${i}`] = Boolean(partySize == i);
      }
      return {
        subId: restaurantId,
        timePicker: {
          $template: 'time-picker',
          models: [timePicker]
        }
      };
    }
    initializeEvent() {
      /* Default time selection:
        *  - if later than 10pm, book evening tomorrow
        *  - if earlier than 5pm, book this evening
        *  - round up to next half hour and set seconds to 0
        *
        * (i.e. earliest can be 5:30pm and latest 10pm)
        */
      const when = new Date();
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
      return {startDate: whenString, endDate: whenString, participants: 2};
    }
    toDateInputValue(date) {
      const local = new Date(date);
      local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return local.toJSON().slice(0, 16);
    }
    // getDescription(restaurant, currentEvent) {
    //   if (restaurant) {
    //     return this.createDescription(restaurant.id, currentEvent.participants, currentEvent.startDate);
    //   }
    //   return '';
    // }
    // createDescription(restaurantId, participants, startDate) {
    //   const times = this.makeUpReservationTimes(restaurantId, participants, startDate, 5);
    //   let closest = null;
    //   times.map(({time, notAvailable}, i) => {
    //     if (!notAvailable) {
    //       if (!closest || i <= 2) {
    //         // 2 is the closest time to default time
    //         closest = time;
    //       }
    //     }
    //   });
    //   return closest
    //     ? `Table for ${participants} available at ${closest}`
    //     : `No table for ${participants} available within 2 hours`;
    // }
    onDateChanged(e, state) {
      const newEvent = Object.assign({}, state.currentEvent || {participants: 2});
      newEvent.startDate = newEvent.endDate = e.data.value;
      this.storeNewEvent(newEvent);
    }
    onPartySizeChanged(e, state) {
      const newEvent = Object.assign({}, state.currentEvent || {});
      newEvent.participants = Number(e.data.value);
      this.storeNewEvent(newEvent);
    }
    storeNewEvent(newEvent) {
      const event = this.handles.get('event');
      event.set(new event.entityClass(newEvent));
    }
  };

});
