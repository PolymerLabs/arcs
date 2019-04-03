import { RNG } from "./random";

/** A fake random number generator implementation. Takes a list of input values and returns them sequentially in order (until it runs out). */
export class FakeRandom implements RNG {
  private _i = 0;
  constructor(private _values: number[]) {}

  next(): number {
    if (this._i < this._values.length) {
      return this._values[this._i++];
    } else {
      throw new Error('Ran out of fake random numbers');
    }
  }
}
