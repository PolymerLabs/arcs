/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Consumer} from '../hot.js';
import {checkDefined} from './preconditions.js';

// tslint:disable: no-any

export enum ExpectedResponse {
  Void,
  Defer,
  Constant
}

export enum SequenceOutput {
  Replace,
  Register
}

export interface InputResponseObject {
  response?: any;
  responseCheck?: Consumer<any>;
  type: ExpectedResponse;
}

export interface OutputResponseObject {
  response?: any;
  default?: any;
  onOutput?: Consumer<any>;
  type: ExpectedResponse;

}

export interface SequenceChange {
  variable?: any;
  input?: any[];
  inputFn?: () => any[];
  output?: {[index: string]: any};
  id?: string;
}

type InterleavingEntry = {
  index: number;
  delay: number;
  change: SequenceChange;
};

interface Variable {
  value: any;
  initialValue?: any;
  initialFn?: any;
}

interface Input {
  name: string;
  delay: number;
  results: any[];
  response: InputResponseObject;
}

interface Output {
  name: string;
  response: OutputResponseObject;
  behavior: SequenceOutput;
  value: any;
  variable: string;
}

interface Sensor {
  name: string;
  endInvariants: (Consumer<any>)[];
}

/**
 * Sequence testing utility. Takes a set of events with asynchronous effect across one or more inputs,
 * generates the full set of possible orderings, and tests each one.
 *
 * NOTE: Do not use this utility in unit tests! Sequence tests are not unit tests
 * and can not replace unit testing.
 *
 * NOTE: If sequence testing turns up a failure case, you MUST REPRODUCE that failure case with
 * a unit test as part of the patch that fixes the issue. This guards against regressions more
 * cleanly than relying on the sequence tests directly.
 *
 * Recommended location: in a file called ${thing}-sequence-test.ts, alongside the
 * unit tests that are in ${thing}-test.ts.
 *
 * Basic Usage:
 * (1) construct a SequenceTest object
 * (2) specify how to construct the object under test with setTestConstructor()
 * (3) specify some inputs (places where data can be poked into the object under test) with registerInput()
 * (4) specify some outputs (places where data gets pushed out of the object under test) with registerOutput()
 * (5) provide a set of events for each input with setChanges()
 * (6) provide some end invariants with setEndInvariant()
 * (7) run sequenceTest.test()
 *
 * Note that any per-ordering state needs to be mediated by the SequenceTest object, as if you try and
 * keep state directly in your sequence test then it won't reset between orderings. You can:
 * (a) register a per-ordering variable with sequenceTest.registerVariable()
 * (b) set its value with sequenceTest.setVariable()
 * (C) query the current value with sequenceTest.getVariable()
 *
 * See storage/tests/store-sequence-test.ts for some fairly comprehensive examples of sequence testing
 * in practise.
 */
export class SequenceTest<T> {
  private prepareFunction: (() => T) | (() => Promise<T>);
  private currentID = 0;

  private changes: {[index: string]: SequenceChange[]} = {};

  private inputs: Map<string, Input> = new Map();
  private variables: Map<string, Variable> = new Map();
  private sensors: Map<string, Sensor> = new Map();
  private outputs: Map<string, Output> = new Map();

  private interleavingLog: string[];
  private currentTestObject: T | null = null;

  /**
   * Set a function that constructs a fresh instance of the object under test for each ordering.
   */
  setTestConstructor(prepareFunction: (() => T) | (() => Promise<T>)) {
    this.prepareFunction = prepareFunction;
  }

  /**
   * Register an input for the object under test. An input is a function that will be provided
   * with a series of data updates.
   *
   * @param name the function name to invoke in order to provide input
   * @param asyncCount the maximum number of internal awaits within the function (including
   *                   child functions)
   * @param response either {type: Void} (the function should not return a value),
   *                 or {type: Constant, response: v} (the function should return v)
   *                 or {type: Defer, checkResponse: (v) => void} (the return value of
   *                         the function will be passed to checkResponse)
   */
  registerInput(name: string, asyncCount: number, response: InputResponseObject): string {
    const id = name + this.currentID++;
    this.inputs.set(id, {name, delay: asyncCount, response, results: []});
    return id;
  }

  /**
   * Register an output for the object under test. An output is a function that will be
   * invoked as the object is fed changes. The parameters provided to the output can be
   * inspected as part of the test.
   *
   * @param name the function name to replace or register with. Note that dotted syntax can
   *             be used to register outputs on sub-objects.
   * @param response either {type: Void} (the function won't return a value),
   *                 or {type: Constant, response: v} (the function will return v),
   *                 or {type: Defer, default: v} (the function will return v initially).
   *                 The response object can also contain an onOutput: (v) => void which
   *                 can be used to check the value provided to the output function.
   * @param behavior either Register (the function of name `name` will be invoked in order
   *                                  to register an output function)
   *                 or Replace (the function of name `name` will be replaced with an output
   *                             function)
   *                 (i.e. use Replace if you want to override a function on the object under
   *                 test with one that captures the value it's invoked with and returns
   *                 something under test framework control. Use Register if the object under
   *                 test has some capability for registering a callback and you want to do
   *                 that.)
   * @param variable if behavior is Register and a valid variable id is provided here, then
   *                 the result of invoking the registration function will be stored in that
   *                 variable.
   *
   * Example: if a 'onOutput' function on the object under test is invoked by the object, and
   * you want to replace it with something that always returns void:
   * sequenceTest.registerOutput('onOutput', {type: Void}, SequenceOutput.Replace);
   *
   * If a 'registerOutputHandler function exists on the object under test, which is used to
   * register callbacks on the object, and you want to register a callback:
   * sequenceTest.registerOutput('registerOutputHandler', {type: Void}, SequenceOutput.Register, outputID);
   * Note that functions that register callbacks often return some kind of identifier that can
   * be used to refer to the callback later. In this example, that value will be stored in the
   * variable 'outputID'.
   *
   * If the object under test has a property 'foo' with an output function 'bar' that you want
   * to replace:
   * sequenceTest.registerOutput('foo.bar', {type: Void}, SequenceOutput.Replace);
   */
  registerOutput(name: string, response: OutputResponseObject, behavior: SequenceOutput, variable: string|null = null) {
    if (behavior !== SequenceOutput.Register) {
      assert.strictEqual(variable, null);
    }
    const id = name + this.currentID++;
    this.outputs.set(id, {name, response, value: response.default, behavior, variable});
    return id;
  }

  /**
   * Register a sensor for the object under test. Sensors are values that will change as the object
   * is tested, and can be accessed as part of invariant specification.
   *
   * @param name the name of the field to read.
   */
  registerSensor(name: string) {
    const id = name + this.currentID++;
    this.sensors.set(id, {name, endInvariants: []});
    return id;
  }

  /**
   * Register a variable. Variable values are reset before each ordering is tested.
   *
   * @param initialValue either the initial value of the variable, or a function that generates
   *                     that value.
   * @param initializerIsFunction True if the initial value is a function.
   */
  registerVariable(initialValue: any, initializerIsFunction=false) {
    const id = 'var' + this.currentID++;
    if (initializerIsFunction) {
      this.variables.set(id, {initialFn: initialValue, value: initialValue()});
    } else {
      this.variables.set(id, {initialValue, value: initialValue});
    }
    return id;
  }

  /**
   * Retrieve the current value of a variable. Use inside closures (e.g. in an onOutput or
   * checkResponse closure) to provide access to data that varies depending on ordering.
   */
  getVariable(id: string): any {
    return this.variables.get(id).value;
  }

  /**
   * Set the current value of a variable.
   */
  setVariable(id: string, value: any) {
    this.variables.get(id).value = value;
  }

  /**
   * Retrieve the current return value for an output.
   */
  getOutput(id: string) {
    return this.outputs.get(id).value;
  }

  /**
   * Set a sequence of changes for an input.
   *
   * @param id The input to register changes on.
   * @param changes A list of changes. Each change may have:
   *  - input: the input value to provide for this event.
   *  - inputFn: a function that generates an input value to provide for this event.
   *  - output: a dictionary of id: value that updates the current return values from
   *            output functions
   *  - variable: a dictionary of id: value that updates the current value of variables
   */
  setChanges(id: string, changes: SequenceChange[]) {
    this.changes[id] = changes.map(({input, inputFn, output, variable}) =>
      ({input, inputFn, output, variable, id})
    );
  }

  /**
   * set an end invariant for a given sensor.
   *
   * @param id The sensor to set an end invariant on
   * @param test a function that takes the final sensor value and asserts properties
   */
  setEndInvariant(id: string, test: Consumer<any>) {
    this.sensors.get(id).endInvariants.push(test);
  }

  testObject() {
    return this.currentTestObject;
  }

  private resetVariables() {
    for (const variable of this.variables.values()) {
      if (variable.initialFn) {
        variable.value = variable.initialFn();
      } else {
        variable.value = variable.initialValue;
      }
    }
  }

  private resetResults() {
    for (const input of this.inputs.values()) {
      input.results = [];
    }
  }

  private async awaitResults() {
    const allInputs = [...this.inputs.values()].map(a => a.results).reduce((a, b) => a.concat(b));

    const uniquePromise = Promise.resolve('YOONIQ');
    const output = await Promise.race([Promise.all(allInputs), Promise.all([uniquePromise])]);
    if (output[0] === 'YOONIQ') {
      console.log(...this.interleavingLog);
      throw new Error(`Additional async point found!`);
    }

    for (const input of this.inputs.values()) {
      input.results = await Promise.all(input.results);
    }
  }

  private objAndName(obj, name: string) {
    const initialObj = obj;
    const parts = name.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
      if (obj === undefined) {
        throw new Error(`name ${name} invalid for ${initialObj}`);
      }
    }

    return {object: obj, name: parts[parts.length - 1]};
  }

  private setupOutputs(obj) {

    for (const output of this.outputs.values()) {
      const responseChecker = value => {
        this.interleavingLog.push('->');
        this.interleavingLog.push(value);
        this.interleavingLog.push('\n');
        if (output.response.onOutput) {
          try {
            output.response.onOutput(value);
          } catch (e) {
            console.log(...this.interleavingLog);
            throw e;
          }
        }
        return output.value;
      };

      if (output.response.type === ExpectedResponse.Defer) {
        output.value = output.response.default;
      }

      const {object: theObject, name} = this.objAndName(obj, output.name);

      if (output.behavior === SequenceOutput.Replace) {
        theObject[name] = responseChecker;
      } else if (output.behavior === SequenceOutput.Register) {
        const result = theObject[name](responseChecker);
        if (output.variable) {
          this.setVariable(output.variable, result);
        }
      }
    }
  }

  /*
   * This generator produces all interleavings of a list of ordered lists
   * of choices. The orderings in each list can't be violated but each item
   * can be chosen from any list.
   *
   * For example, if the list of ordered lists is [[a,b,c], [d,e], [f]] then
   * the first choice can be a, d, or f. Then:
   * - if the first choice was a, the second choice could be b, d or f.
   * - if the first choice was d, the second choice could be a, e or f.
   * - if the first choice was f, the second choice could be a or d.
   *
   * This function doesn't care what the actual choices are, it just returns
   * information representing the possible orderings. As input it takes:
   * - length: total number of choices across all lists (6 in our example above).
   * - amounts: the number of choices in each list ([3, 2, 1] in our example above)
   *
   * As output, the generator will return a list of indexes into the list of lists;
   * the represent "choose from this list next".
   *
   * However! As an implementation detail, it turns out to be *way* easier to
   * iteratively generate these outputs if exhausted lists (i.e. those with all
   * inputs selected) are removed from the lists of lists, and future output indexes
   * take this into account.
   *
   * So you'd expect the interleaving adbefc to be output as [0,1,0,1,2,0]. But
   * you'd be wrong. After the second '1', there's no choices left in [d,e], so
   * it gets dropped from the list of lists and the next choice is between 0 (c)
   * or 1 (f). This means that adbefc is in fact represented as [0,1,0,1,1,0].
   *
   * If you're curious, the reason for this is that by dropping exhausted inputs
   * the code can iterate as if its counting - [0,0,0,0,0,0] is always valid, then
   * starting from the RHS we can test if incrementing a choice by 1 would be
   * valid or not; if it is, that's the next output. If it isn't, then we reset
   * that choice to 0 (always valid) and try incrementing the next left-most
   * output. So our list of orderings for [[a,b,c], [d,e], [f]] would be:
   * 000000 (abcdef)
   * 000010 (abcdfe)
   * 000100 (abcfde)
   * 001000 (abdcef)
   * 001010 (abdcfe)
   * 001100 (abdecf)
   * 001110 (abdefc)
   * 001200 (abdfce)
   * etc..
   */
  private* interleavings_raw(length: number, amounts: number[]): IterableIterator<number[]> {
    const currentChoice: number[] = [];
    for (let i = 0; i < length; i++) {
      currentChoice.push(0);
    }

    yield currentChoice;

    while (true) {
      let done = false;
      for (let j = currentChoice.length - 2; j >= 0; j--) {
        let localAmounts = amounts.slice();
        for (let i = 0; i < j; i++) {
          localAmounts[currentChoice[i]] -= 1;
          if (localAmounts[currentChoice[i]] === 0) {
            localAmounts = localAmounts.splice(currentChoice[i], 1);
          }
        }
        if (localAmounts.length - 1 > currentChoice[j]) {
          currentChoice[j]++;
          break;
        } else {
          currentChoice[j] = 0;
          if (j === 0) {
            done = true;
          }
        }
      }
      if (done) {
        return;
      } else {
        yield currentChoice;
      }
    }
  }

  private* choosePoint(previous: number, interleaving: InterleavingEntry[], interleavingDelays: number[]): IterableIterator<InterleavingEntry[]> {
    if (interleavingDelays[interleavingDelays.length - 1] === 0) {
      yield interleaving;
      return;
    }
    for (let i = interleaving.length; i > previous; i--) {
      if (interleavingDelays[i - 1] > 0) {
        if (i < interleaving.length && interleaving[i].index === -1) {
          continue;
        }
        const nextInterleaving = interleaving.slice();
        nextInterleaving.splice(i, 0, {index: -1, delay: 0, change: null});
        let nextInterleavingDelays = interleavingDelays.slice(0, i);
        nextInterleavingDelays.push(interleavingDelays[i - 1] - 1);
        nextInterleavingDelays = nextInterleavingDelays.concat(
          this.computeInterleavingDelays(interleavingDelays[i - 1] - 1, interleaving.slice(i))
        );
        const iter = this.choosePoint(i, nextInterleaving, nextInterleavingDelays);
        while (true) {
          const next = iter.next();
          if (next.done) {
            break;
          }
          yield next.value;
        }
      }
    }
  }

  // TODO: not all steps in an input sequence are actually inputs.
  // Need to ensure that those which are not don't increase the
  // delays.
  private computeInterleavingDelays(max: number, interleaving: InterleavingEntry[]) {
    const result: number[] = [];
    for (const entry of interleaving) {
      if (entry.index === -1) {
        max -= 1;
      } else if (entry.change.input !== undefined || entry.change.inputFn !== undefined) {
        max = Math.max(max, entry.delay);
      }
      result.push(max);
    }

    return result;
  }

  /*
   * length: total number of stages.
   * amounts: an array of inputs, with the number of stages in each input.
   *
   * Uses interleavings_raw to generate all the permutations of choice of the next stage in each input
   * until all stages are exhausted.
   *
   * The algorithm then inserts wait states based on the number of internal awaits listed against
   * each input.
   */
  private* interleavings() {
    let length = 0;
    const amounts: number[] = [];
    for (const input of this.inputs.keys()) {
      length += this.changes[input].length;
      amounts.push(this.changes[input].length);
    }

    const raw = this.interleavings_raw(length, amounts);

    while (true) {
      const next = raw.next();
      if (next.done) {
        return;
      }

      // Convert the interleaving to use consistent index rather than one based
      // on remaining stages.
      const inputList = [...this.inputs.keys()].map(name => this.changes[name].length);
      const originalInputs = [...this.inputs].map((name, idx) => idx);
      const interleaving = next.value.map(a => {
        const result = originalInputs[a];
        inputList[a]--;
        if (inputList[a] === 0) {
          inputList.splice(a, 1);
          originalInputs.splice(a, 1);
        }
        return result;
      });

      // compute the delays
      const delays: number[] = [];
      const currIDX: {[index: number]: number} = {};
      for (const input of this.inputs.values()) {
        currIDX[delays.length] = 0;
        delays.push(input.delay);
      }

      const inputs = [...this.inputs.keys()];
      // Add information about delays and whether inputs are called
      const newInterleaving = interleaving.map((index: number) => {
        const idx = currIDX[index]++;
        return {index, delay: delays[index], change: this.changes[inputs[index]][idx]};
      });

      const interleavingDelays = this.computeInterleavingDelays(0, newInterleaving);

      const iter = this.choosePoint(0, newInterleaving, interleavingDelays);
      while (true) {
        const next = iter.next();
        if (next.done) {
          break;
        }
        yield next.value;
      }
    }
  }

  /**
   * Run the test!
   */
  async test() {

    const interleavings = this.interleavings();

    let permutationCount = 0;

    while (true) {
      const next = interleavings.next();
      if (next.done) {
        break;
      }

      permutationCount++;

      const interleaving = next.value;

      const description = interleaving.map(a => {
        if (a.index === -1) {
          return 'DELAY';
        }
        if (a.change.input || a.change.inputFn) {
          return this.inputs.get(a.change.id).name;
        }
        return `(${this.inputs.get(a.change.id).name})`;
      }).join(', ');

      this.resetResults();
      this.resetVariables();
      let obj = this.prepareFunction();
      if (obj instanceof Promise) {
        obj = await obj;
      }
      this.setupOutputs(obj);
      this.currentTestObject = obj;

      this.interleavingLog = ['--', description, '\n'];
      for (const item of interleaving) {

        if (item.index === -1) {
          this.interleavingLog = this.interleavingLog.concat(['*AWAIT*', '\n']);
          await 0;
          continue;
        }

        const input = checkDefined(this.inputs.get(item.change.id));

        this.interleavingLog.push(input.name);

        if (item.change.output) {
          for (const id of Object.keys(item.change.output)) {
            this.interleavingLog = this.interleavingLog.concat(['[', '->', this.outputs.get(id).name, item.change.output[id], ']', '\n']);
            this.outputs.get(id).value = item.change.output[id];
          }
        }

        if (item.change.variable) {
          for (const id of Object.keys(item.change.variable)) {
            this.interleavingLog = this.interleavingLog.concat(['[', '!', id, item.change.variable[id]]);
            this.variables.get(id).value = item.change.variable[id];
          }
        }

        if (item.change.input || item.change.inputFn) {
          const value = item.change.input ? item.change.input : item.change.inputFn();
          this.interleavingLog.push('<-');
          this.interleavingLog = this.interleavingLog.concat(value);
          this.interleavingLog.push(']');
          const {object: theObject, name} = this.objAndName(obj, input.name);
          input.results.push(theObject[name](...value));
        }

        this.interleavingLog.push('\n');
      }

      await this.awaitResults();

      for (const input of this.inputs.values()) {
        if (input.response.type === ExpectedResponse.Constant) {
          for (const result of input.results) {
            assert.strictEqual(result, input.response.response);
          }
        }
        else if (input.response.type === ExpectedResponse.Defer) {
          for (const result of input.results) {
            input.response.responseCheck(result);
          }
        }
      }

      if (this.sensors.size > 0) {
        this.interleavingLog.push('result:');
        for (const sensor of this.sensors.values()) {
          const {object: theObject, name} = this.objAndName(obj, sensor.name);
          this.interleavingLog.push(sensor.name, theObject[name]);
        }
        this.interleavingLog.push('\n');
      }

      for (const sensor of this.sensors.values()) {
        for (const test of sensor.endInvariants) {
          try {
            const {object: theObject, name} = this.objAndName(obj, sensor.name);
            await test(theObject[name]);
          } catch (e) {
            console.log(...this.interleavingLog);
            throw e;
          }
        }
      }
    }


    console.log(`${permutationCount} permutations tested`);
  }
}
