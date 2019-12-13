/// BareSpecifier=moment\src\lib\duration\get
import { normalizeUnits } from '../units/aliases.js';
import absFloor from '../utils/abs-floor.js';

export function get(units) {
    units = normalizeUnits(units);
    return this.isValid() ? this[units + 's']() : NaN;
}

function makeGetter(name) {
    return function () {
        return this.isValid() ? this._data[name] : NaN;
    };
}

export var milliseconds = makeGetter('milliseconds');
export var seconds = makeGetter('seconds');
export var minutes = makeGetter('minutes');
export var hours = makeGetter('hours');
export var days = makeGetter('days');
export var months = makeGetter('months');
export var years = makeGetter('years');

export function weeks() {
    return absFloor(this.days() / 7);
}