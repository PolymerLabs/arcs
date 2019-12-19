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
import {DontTrace, SystemTrace} from '../../tracelib/systrace.js';
import {getGlobalScope} from '../../tracelib/systrace-helpers.js';
import {Client} from '../../tracelib/systrace-clients.js';

// Verifies data consistency (no pollution and no corruption on accesses).
const DATA_PROPERTY_VALUE = Date.now();

class TestClient extends Client {
  static traces: string[] = [];

  asyncTraceBegin(tag: string, cookie: number) {
    const deTags = tag.split('::');
    // Strict length to detect protocol changes.
    if (deTags.length === 3) {
      TestClient.traces.push('++' + deTags[2]);
    }
  }

  asyncTraceEnd(tag: string, cookie: number) {
    const deTags = tag.split('::');
    if (deTags.length === 3) {
      TestClient.traces.push('--' + deTags[2]);
    }
  }

  static get answer() { return TestClient.traces; }
  static clear() { TestClient.traces = []; }
}

abstract class Base {
  static staticMethodBase() {}
  instanceMethodBase() {}
}

@SystemTrace
class Foo extends Base {
  static readonly staticValue: number = DATA_PROPERTY_VALUE;
  value: number = DATA_PROPERTY_VALUE;

  static staticMethodFoo() {}
  @DontTrace
  static staticMethodFooDontTrace() {}

  constructor() { super(); }

  instanceMethodFoo() {}
  instanceMethodForOverride1() {}
  @DontTrace
  instanceMethodForOverride2() {}
  instanceMethodForOverride3() {}
  @DontTrace
  instanceMethodFooDontTrace() {}

  set data(value: number) { this.value = value; }
  get data() { return this.value; }
}

class Bar extends Foo {
  value: number = DATA_PROPERTY_VALUE;

  static staticMethodBar() {}
  @DontTrace
  static staticMethodBarDontTrace() {}

  constructor() { super(); }

  instanceMethodBar() {}
  instanceMethodForOverride1() { super.instanceMethodForOverride1(); }
  instanceMethodForOverride2() { super.instanceMethodForOverride2(); }
  instanceMethodForOverride3() {}
  @DontTrace
  instanceMethodBarDontTrace() {}

  set data(value: number) { this.value = value; }
  get data() { return this.value; }
}

describe('System Trace', () => {
  before(() => {
    const gs = getGlobalScope();
    gs.systemTraceClientClassOverride = TestClient;
  });

  beforeEach(() => {
    TestClient.clear();
  });

  it('no corruption of data properties', () => {
    const foo = new Foo();
    const bar = new Bar();
    assert.strictEqual(Foo.staticValue, DATA_PROPERTY_VALUE);
    assert.strictEqual(foo.data, DATA_PROPERTY_VALUE);
    assert.strictEqual(bar.data, DATA_PROPERTY_VALUE);
  });

  it('no tracing on constructor', () => {
    const foo = new Foo();
    const bar = new Bar();
    assert.isEmpty(TestClient.answer);
  });

  it('no tracing on getters and setters', () => {
    const foo = new Foo();
    const bar = new Bar();
    foo.data = bar.data;
    bar.data = foo.data;
    assert.isEmpty(TestClient.answer);
  });

  it('auto-traces non-annotated super-class', () => {
    const answer = [
        '++instanceMethodBase', '--instanceMethodBase',
    ];
    const foo = new Foo();
    foo.instanceMethodBase();
    assert.deepStrictEqual(TestClient.answer, answer);
  });

  it('auto-traces non-annotated sub-class', () => {
    const answer = [
        '++instanceMethodBar', '--instanceMethodBar',
    ];
    const bar = new Bar();
    bar.instanceMethodBar();
    assert.deepStrictEqual(TestClient.answer, answer);
  });

  it('@DontTrace annotated methods should bypass tracing', () => {
    const foo = new Foo();
    const bar = new Bar();
    Foo.staticMethodFooDontTrace();
    Bar.staticMethodBarDontTrace();
    foo.instanceMethodFooDontTrace();
    bar.instanceMethodBarDontTrace();
    assert.isEmpty(TestClient.answer);
  });

  it('static method tracing', () => {
    const answer = [
        '++staticMethodFoo', '--staticMethodFoo',
        '++staticMethodBar', '--staticMethodBar',
    ];
    Foo.staticMethodFoo();
    Bar.staticMethodBar();
    assert.deepStrictEqual(TestClient.answer, answer);
  });

  it('instance method tracing', () => {
    const answer = [
        '++instanceMethodFoo', '--instanceMethodFoo',
        '++instanceMethodBar', '--instanceMethodBar',
    ];
    const foo = new Foo();
    const bar = new Bar();
    foo.instanceMethodFoo();
    bar.instanceMethodBar();
    assert.deepStrictEqual(TestClient.answer, answer);
  });

  it('overridden instance method tracing (execute super-class call)', () => {
    const answer = [
        '++instanceMethodForOverride1', '++instanceMethodForOverride1',
        '--instanceMethodForOverride1', '--instanceMethodForOverride1',
    ];
    const bar = new Bar();
    bar.instanceMethodForOverride1();
    assert.deepStrictEqual(TestClient.answer, answer);
  });

  it('overridden instance method tracing (@DontTrace super-class call)', () => {
    const answer = [
        '++instanceMethodForOverride2', '--instanceMethodForOverride2',
    ];
    const bar = new Bar();
    bar.instanceMethodForOverride2();
    assert.deepStrictEqual(TestClient.answer, answer);
  });

  it('overridden instance method tracing (skip super-class call)', () => {
    const answer = [
        '++instanceMethodForOverride3', '--instanceMethodForOverride3',
    ];
    const bar = new Bar();
    bar.instanceMethodForOverride3();
    assert.deepStrictEqual(TestClient.answer, answer);
  });

  it('no duplicate tracing when there are multiple instances', () => {
    const answer = [
        '++instanceMethodFoo', '--instanceMethodFoo',
        '++instanceMethodFoo', '--instanceMethodFoo',
        '++instanceMethodBar', '--instanceMethodBar',
        '++instanceMethodBar', '--instanceMethodBar',
    ];
    const foos = [new Foo(), new Foo()];
    const bars = [new Bar(), new Bar()];
    for (const foo of foos) {
      foo.instanceMethodFoo();
    }
    for (const bar of bars) {
      bar.instanceMethodBar();
    }
    assert.deepStrictEqual(TestClient.answer, answer);
  });

  it('verifies tracing availability and timing', () => {
    const answer = [
      '++call', '--call',
    ];

    class BaseClass {call() {}}
    @SystemTrace class SubClass extends BaseClass {}

    const obj = new BaseClass();
    // BaseClass is not annotated @SystemTrace thus should not generate traces
    // on call() invocation at this point.
    obj.call();

    const subObj = new SubClass();

    // SubClass derived from BaseClass and being annotated @SystemTrace,
    // instantiation would harness tracing on both of SubClass and BaseClass.
    obj.call();

    assert.deepStrictEqual(TestClient.answer, answer);
  });
});
