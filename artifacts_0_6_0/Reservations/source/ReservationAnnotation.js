// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {

  const host = `reservation-form`;

  const template = html`

<div ${host} id={{subId}}>
  <style>
    [${host}] {
      text-align: center;
    }
    [${host}] > * {
      vertical-align: middle;
    }
    [${host}] .x-select {
      padding-left: 16px;
      display: flex;
      position: relative;
    }
    [${host}] .x-select::after {
      content: '▼';
      display: block;
      position: absolute;
      right: 8px;
      bottom: 16px;
      transform: scaleY(0.4) scaleX(0.8);
      pointer-events: none;
    }
    [${host}] .x-select > select {
      position: relative;
      margin: 0;
      padding: 0;
      border: 0;
      background-color: transparent;
      border-radius: 0;
      font-size: 16px;
      overflow: hidden;
      outline: none;
      -webkit-appearance: none;
      vertical-align: top;
    }
    [${host}] input {
      font-family: 'Google Sans';
      font-size: 16px;
      vertical-align: top;
      border: 0;
      background: transparent;
      padding-left: 16px;
    }
    [${host}] input::-webkit-clear-button {
      display: none;
    }
    /* [${host}] [timePicker] {
      display: flex;
      flex-direction: row;
    } */
    [${host}] [times] {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    @media (min-width:480px) {
      [${host}] [times] {
        Xpadding: 16px 20px;
      }
    }
    [${host}] [times] > button {
      position: relative;
      Xdisplay: block;
      Xdisplay: inline-flex;
      Xalign-items: center;
      Xtext-align: center;
      width: 44px;
      height: 44px;
      padding: 0;
      -webkit-appearance: none;
      outline: none;
      border: 2px solid #1A73E8;
      background: white;
      color: #1A73E8;
      border-radius: 50%;
      font-size: 14px;
      font-weight: bold;
    }
    [${host}] [times] > button:disabled {
      opacity: 0.3;
    }
  </style>
  <!-- <div timePicker>{{timePicker}}</div> -->
  <div times>{{availableTimes}}</div>
</div>

<!-- <template time-picker>
  <div class="x-select">
    <select on-change="_onPartySizeChanged">
      <option value="1" selected$={{selected1}}>1 person</option>
      <option value="2" selected$={{selected2}}>2 people</option>
      ${[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
        .map(i => `<option value="${i}" selected$={{selected${i}}}>${i} people</option>`).join('')}
      <option value="21" selected$={{selected21}}>Larger party</option>
    </select>
  </div>
  <input type="datetime-local" value="{{date}}" on-change="_onDateChanged">
</template> -->

<template available-times>
  <button disabled$={{notAvailable}}>{{time}}</button>
</template>
`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    willReceiveProps(props, state) {
      if (!props.event) {
        const now = this.toDateInputValue(new Date());
        const event = {startDate: now, endDate: now, participants: 2};
        this._setState({currentEvent: event});
      } else {
        const event = props.event;
        this._setState({currentEvent: event});
      }
    }
    toDateInputValue(date) {
      const local = new Date(date);
      local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return local.toJSON().slice(0, 16);
    }
    render({restaurant}, {currentEvent}) {
      if (restaurant) {
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
        const notAvailable = (seed*(hour*2+minute/30)*(ts/86400000))%10 <= partySize;
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
