/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export class TimeUnit {

  private constructor(
    /** a value to return for toString() */
    private readonly name: string,

    /** The seconds portion of the duration */
    public readonly durationSec: number,

    /** The nanoseconds portion of the duration */
    public readonly durationNS: number,

    /**
     * If the timeunit is approximate.  Note that leap seconds are
     * not used, so this pertains to dates only..
     */
    public readonly estimated = false) {
  }

  /**  Unit that represents the concept of a nanosecond. */
  static readonly NANOS: TimeUnit = new TimeUnit('NANOS', 0, 1);

  /** Unit that represents the concept of a microsecond. */
  static readonly MICROS: TimeUnit = new TimeUnit('MICROS', 0, 1000);

  /** Unit that represents the concept of a millisecond. */
  static readonly MILLIS: TimeUnit = new TimeUnit('MILLIS', 0, 1000000);

  /** Unit that represents the concept of a second. */
  static readonly SECONDS: TimeUnit = new TimeUnit('SECONDS', 1, 0);

  /** Unit that represents the concept of a minute. */
  static readonly MINUTES: TimeUnit = new TimeUnit('MINUTES', 60, 0);

  /** Unit that represents the concept of an hour. */
  static readonly HOURS: TimeUnit = new TimeUnit('HOURS', 3600, 0);

  /** Unit that represents the concept of a week. */
  static readonly DAYS: TimeUnit = new TimeUnit('DAYS', 86400, 0);

  /** Unit that represents the concept of a week. */
  static readonly WEEKS: TimeUnit = new TimeUnit('WEEKS', 604800, 0);

  /** Unit that represents the concept of a month, 30 days, approximate. */
  static readonly MONTHS: TimeUnit = new TimeUnit('MONTHS', 2592000, 0, true);

  /** Unit that represents the concept of a year, 365 days, approximate */
  static readonly YEARS: TimeUnit = new TimeUnit('YEARS', 31536000, 0, true);

  /** An uppercase string matching the name of the constant. ex MILLIS */
  public toString() {
    return this.name;
  }

  // TODO DECADES, CENTURIES, MILLENIA, ERAS
}
