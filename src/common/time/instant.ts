/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {TimeUnit} from './timeunit.js';

/**
 * An Instant represents a specific instance of universal time with a
 * defined precision.  It is loosely based on the same class in the
 * TC39 temporal specification, with added resolution/precision data.
 *
 * @see https://github.com/tc39/proposal-temporal/blob/master/spec/instant.html
 *
 * TODO implement comparable?
 * TODO implement other utility methods.
 * TODO make sure Instant works with time arithmetic.
 */
export class Instant {
  private readonly secs: number;
  private readonly nanos: number;
  private readonly resolutionValue: TimeUnit;

  private constructor(secs: number, nanos, resolution: TimeUnit) {
    if (nanos > 1000000 || nanos < 0 || secs < 0) {
      throw new Error('input values out of range secs=' + secs + ' nanos=' + nanos);
    }
    this.secs = secs;
    this.nanos = nanos;
    this.resolutionValue = resolution;
  }

  // TODO epochNanoseconds and epochMicroseconds require bigint

  /**
   * Returns the rounded number of milliseconds from the Epoch for this Instant..
   */
  get epochMilliseconds(): number {
    return this.secs * 1000 + Math.round(this.nanos / 1000);
  }

  /**
   * Returns the rounded number of seconds from the Epoch for this Instant.
   */
  get epochSeconds(): number {
    return this.nanos > 500000 ? this.secs + 1 : this.secs;
  }

  /**
   * Provides the resolution of this Instant based on the inputs
   */
  get resolution(): TimeUnit {
    return this.resolutionValue;
  }

  /**
   * Returns a truncated Instant based on the current value and the
   * specified TimeUnit.
   *
   * Throws if the specified TimeUnit is finer than the current TimeUnit;
   */
  truncateTo(timeunit: TimeUnit): Instant {
    const truncate = Instant.toStringTruncation.get(timeunit);
    if (!truncate) {
      throw new Error('unimplemented resolution' + timeunit);
    }

    const asString = this.toString();

    // TODO(lindner): Replace with direct TimeUnit compare.
    if (truncate > asString.length) {
      throw new Error('specified timeunit is finer than current precision');
    }
    return Instant.fromString(asString.substr(0, truncate));
  }

  /**
   * Creates a new Instant from the given milliseconds.  The returned
   * value uses TimeUnit.MILLIS as the resolution.
   */
  static fromEpochMilliseconds(epochMillis: number): Instant {
    // TODO check for negative numbers.
    const secs = Math.floor(epochMillis/1000);
    const nanos = (epochMillis % 1000) * 1000;
    return new Instant(secs, nanos, TimeUnit.MILLIS);
  }


  /**
   * Creates a new Instant from the given seconds.  The returned
   * value uses TimeUnit.SECONDS as the resolution.
   */
  static fromEpochSeconds(epochSeconds: number): Instant {
    return new Instant(epochSeconds, 0, TimeUnit.SECONDS);
  }

  // Provides constants for parsing differnet input lengths
  // TODO add millis and nanos resolutions
  private static inputLenParseData: ReadonlyMap<number, {timeunit: TimeUnit, suffix: string}> = new Map(
    [[4,  {timeunit: TimeUnit.YEARS, suffix: '-01-01'}],
     [7,  {timeunit: TimeUnit.MONTHS, suffix: '-01'}],
     [10, {timeunit: TimeUnit.DAYS, suffix: ''}],
     [13, {timeunit: TimeUnit.HOURS, suffix: ':00:00+00:00'}],
     [16, {timeunit: TimeUnit.MINUTES, suffix: ':00+00:00'}],
     [19, {timeunit: TimeUnit.SECONDS, suffix: '+00:00'}],
     [23, {timeunit: TimeUnit.MILLIS, suffix: '+00:00'}]]);

  // String to truncate based on the TimeUnit
  private static toStringTruncation: ReadonlyMap<TimeUnit, number> = new Map(
    [[TimeUnit.YEARS, 4],
     [TimeUnit.MONTHS, 7],
     [TimeUnit.DAYS, 10],
     [TimeUnit.HOURS, 13],
     [TimeUnit.MINUTES, 16],
     [TimeUnit.SECONDS, 19],
     [TimeUnit.MILLIS, 23]]);


  /**
   * Parses a UTC date string in ISO 8601 format and generates an
   * Instant.  The TimeUnit resolution is derived from the amount of
   * information presented.  For example if `2018-01-18` is used then
   * `TimeUnit.DAYS` is the resolution.
   */
  static fromString(instantToParse: string): Instant {
    if (instantToParse.includes('+')) {
      throw new Error('time zone information not supported, only UTC');
    }

    if (instantToParse.length === 0) {
      throw new Error('requires a string to parse');
    }

    // Determine the TimeUnit based on the length of the string
    const inputLen = instantToParse.length;

    if (inputLen < 4) {
      throw new Error('Decades and centuries not supported');
    }
    // Find procesing parameters based on the input length
    const result = Instant.inputLenParseData.get(instantToParse.length);

    if (!result) {
      throw new Error('invalid instant');
    }
    const {timeunit, suffix} = result;

    // TODO Parse using a more robust implementation
    const epochMillis = Date.parse(instantToParse + suffix);
    const secs = Math.floor(epochMillis/1000);
    const nanos = (epochMillis % 1000) * 1000;
    return new Instant(secs, nanos, timeunit);
  }

  public toString(): string {
    const val = new Date(this.epochMilliseconds).toISOString();
    // Use resolution to truncate output.
    const truncate = Instant.toStringTruncation.get(this.resolution);

    if (!truncate) {
      throw new Error('unimplemented resolution ' + this.resolution.toString());
    }
    return val.substr(0, truncate);
  }
}
