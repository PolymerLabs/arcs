// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let host = `calendar`;

  let styles = `
<style>
  [${host}] {
    padding: 6px;
  }
  [${host}] .date-picker {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 6px 0 12px;
  }
  [${host}] .schedule-icon {
    position: absolute;
    top: 12px;
    left: 28px;
  }
  [${host}] input {
    padding: 5px;
    margin: 2px 6px 0;
    font-size: 14px;
    border: 0;
    background: transparent;
  }
  [${host}] input::-webkit-clear-button {
    display: none;
  }
  [${host}] .scroll-container {
    position: relative;
    height: 90px;
    overflow-y: hidden;
  }
  [${host}][expanded] .scroll-container {
    height: auto;
  }
  [${host}] .expand-button,
  [${host}] .collapse-button {
    margin: 4px auto 0;
    background-color: transparent;
    border: 0;
  }
  [${host}] .expand-button {
    display: block;
  }
  [${host}][expanded] .expand-button {
    display: none;
  }
  [${host}] .collapse-button {
    display: none;
  }
  [${host}][expanded] .collapse-button {
    display: block;
  }
  [${host}] .hour-row {
    display: flex;
  }
  [${host}] .hour-row .label {
    width: 50px;
    padding-right: 10px;
    text-align: right;
    font-size: 12px;
    color: #555;
  }
  [${host}] .hour-row .block {
    flex: 1;
    height: 30px;
    font-size: 0;
  }
  [${host}] .hour-row .block button {
    width: 100%;
    height: 50%;
    background: #FFF;
    border: 1px solid #CCC;
    border-top: 0;
    border-radius: 0;
    outline: none;
  }
  [${host}] .scroll-container div:first-child > .block {
    border-top: 1px solid #CCC;
  }
  [${host}] .events-container {
    position: absolute;
    top: 0;
    left: 60px;
    right: 10px;
  }
  [${host}] .events-container .event {
    position: absolute;
    left: 0;
    right: 0;
    border-radius: 2px;
    padding: 4px;
    box-sizing: border-box;
    background: #4285f4;
    color: #fff;
    font-size: 14px;
    pointer-events: none;
  }
  [${host}] .events-container .selected-event {
    display: flex;
    align-items: center;
    position: absolute;
    left: 0;
    right: 10px;
    border-radius: 2px;
    padding: 4px;
    box-sizing: border-box;
    background: #fff;
    color: #4285f4;
    border: 2px solid #4285f4;
    font-size: 14px;
    pointer-events: none;
  }
  [${host}] .events-container .selected-event .date-icon {
    padding-left: 4px;
  }
  [${host}] .x-button {
    display: inline-flex;
    align-items: center;
    position: relative;
    padding: 4px;
    border-radius: 50%;
    -webkit-appearance: none;
    background-color: #4285f4;
    color: #fff;
    border: 0;
    outline: none;
    overflow: hidden;
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
<div ${host} expanded$="{{expanded}}">
  <div class="date-picker">
    <i class="material-icons schedule-icon">schedule</i>
    <button class="x-button raised" on-click="_onPreviousDayClick"><i class="material-icons">keyboard_arrow_left</i></button>
    <input type="date" value="{{date}}" on-change="_onDateChanged">
    <button class="x-button raised" on-click="_onNextDayClick"><i class="material-icons">keyboard_arrow_right</i></button>
  </div>

  <div class="scroll-container">
    <div style="{{scrollTransform}}">
      ${[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]
        .map(i => `
        <div class="hour-row">
          <div class="label">
            ${i === 0 ? 12 : i > 12 ? i - 12 : i}
            ${i > 11 ? 'PM' : 'AM'}
          </div>
          <div class="block">
            <button on-click="_onTimeClick" value="${i < 10 ? `0${i}` : i}:00"></button>
            <button on-click="_onTimeClick" value="${i < 10 ? `0${i}` : i}:30"></button>
          </div>
        </div>`).join('')}
      <div class="events-container">
        <div class="event" style="{{eventOneStyle}}">{{eventOneName}}</div>
        <div class="event" style="{{eventTwoStyle}}">{{eventTwoName}}</div>
        <div class="event" style="{{eventThreeStyle}}">{{eventThreeName}}</div>
        <div class="selected-event" style="{{selectedEventStyle}}">Selected Time <i class="date-icon material-icons">date_range</i></div>
      </div>
    </div>
  </div>

  <button class="expand-button" on-click="_expandCalendar"><i class="material-icons">expand_more</i></button>
  <button class="collapse-button" on-click="_collapseCalendar"><i class="material-icons">expand_less</i></button>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props, state) {
      const event = Object.assign({}, props.event && props.event.rawData || {});
      this._event = event;
      this._savedStartDate = event.startDate || (new Date()).toJSON().slice(0,16);
      if (!event.startDate) {
        this._storeNewEvent(this._savedStartDate);
      }

      const conflicts = this._findConflicts(this._savedStartDate);
      this.setParticleDescription(
        'you are ' +
        (conflicts.length ? `busy with ${conflicts[0].name}` : 'free') +
        ' ' + this._generateHumanReadableTime(this._savedStartDate) +
        '. Select a different time from your calendar');

    }
    _render(props, state) {
      const events = this._getEventsForDate(this._savedStartDate);
      this._savedStartDate = this._savedStartDate || '';
      const startTime = this._savedStartDate.slice(11);
      const start = this._convertStartTimeToMinutes(startTime);
      const expanded = Boolean(state.expanded);
      return {
        date: this._savedStartDate.slice(0, 10),
        eventOneStyle: events[0].style,
        eventOneName: events[0].name,
        eventTwoStyle: events[1].style,
        eventTwoName: events[1].name,
        eventThreeStyle: events[2].style,
        eventThreeName: events[2].name,
        selectedEventStyle: this._getStyleForTimeBlock(startTime, 60),
        expanded: expanded,
        scrollTransform: expanded ? '' : `transform: translateY(-${start/2 - 30}px)`
      };
    }
    _getEventsForDate(dateString) {
      const date = new Date(dateString);
      let calendar;
      switch (date.getDay()) {
        case 0:
          calendar = [
            {
              name: 'Sleep in',
              time: '06:00',
              length: 180
            },
            {
              name: 'Brunch',
              time: '11:00',
              length: 60
            },
            {
              name: 'Dinner',
              time: '19:00',
              length: 60
            }
          ];
        case 1:
        case 3:
        case 5:
          return [
            {
              name: 'Drop off dry cleaning',
              time: '08:00',
              length: 60
            },
            {
              name: 'Meeting',
              time: '10:00',
              length: 90
            },
            {
              name: 'Work time',
              time: '15:00',
              length: 120
            }
          ];
        default:
          return [
            {
              name: 'Running club',
              time: '07:00',
              length: 90
            },
            {
              name: 'Meeting',
              time: '14:00',
              length: 90
            },
            {
              name: 'Pick up dry cleaning',
              time: '17:00',
              length: 60
            }
          ];
      }

      calendar.forEach(event => event.style = this._getStyleForTimeBlock(event.time, event.length));

      return calendar;
    }
    _findConflicts(startTime) {
      const calendar = this._getEventsForDate(startTime);

      const t = new Date(startTime);
      const startMinute = t.getHours()*60 + t.getMinutes();

      return calendar.filter(event => {
        const eventStart = this._convertStartTimeToMinutes(event.time);

        return (eventStart <= startMinute) && (eventStart + event.length >= startMinute);
      });
    }
    _generateHumanReadableTime(time) {
      const timeString = time.slice(11, 16);

      const now = new Date();
      const t = new Date(time);

      now.setHours(0);
      t.setHours(0);

      const delta = Math.floor((t.getTime() - now.getTime())/86400000);

      switch (delta) {
        case 0:
          return `at ${timeString}`;
        case 1:
          return `tomorrow, at ${timeString}`;
        default:
          const day = t.toString().slice(0, now.getFullYear() === t.getFullYear() ? 10 : 15);
          return `at ${timeString} on ${day}`
      }
    }
    _convertStartTimeToMinutes(startTime) {
      const match = /(\d\d):(\d\d)/.exec(startTime);
      return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : 0;
    }
    _getStyleForTimeBlock(startTime, duration) {
      const start = this._convertStartTimeToMinutes(startTime);
      return `top: ${start/2}px; height: ${duration/2}px`;
    }
    _onPreviousDayClick(e) {
      const date = new Date(this._savedStartDate);
      date.setDate(date.getDate() - 1);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      this._storeNewEvent(date.toJSON().slice(0,16));
    }
    _onNextDayClick(e) {
      const date = new Date(this._savedStartDate);
      date.setDate(date.getDate() + 1);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      this._storeNewEvent(date.toJSON().slice(0,16));
    }
    _onDateChanged(e) {
      this._storeNewEvent(e.data.value + this._savedStartDate.slice(10));
    }
    _onTimeClick(e) {
      this._storeNewEvent(this._savedStartDate.slice(0, 11) + e.data.value);
    }
    _expandCalendar(e) {
      this._setState({ expanded: true });
    }
    _collapseCalendar(e) {
      this._setState({ expanded: false });
    }
    _storeNewEvent(startDate) {
      const event = this._views.get('event');
      const newEvent = Object.assign({}, (this._event || {}), {
        startDate: startDate,
        endDate: startDate
      });
      event.set(new event.entityClass(newEvent));
    }
  };

});
