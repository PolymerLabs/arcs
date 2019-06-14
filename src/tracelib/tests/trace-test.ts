/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {TraceEvent, Tracing} from '../trace.js';

/**
 * For an explainer of event types and exact format google 'Trace Event Format',
 * as of writing available at
 * https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview.
 */

describe('Tracing', () => {

  before(() => {
    Tracing.enable();
  });

  beforeEach(() => {
    Tracing.__clearForTests();
  });

  function assertTimestampsIncreasing(...timestmaps) {
    for (let i = 1; i < timestmaps.length; i++) {
      // Strict increasing can be flaky one some platforms, equality is good enough too.
      assert.isAtLeast(timestmaps[i], timestmaps[i - 1],
        `Expected sequence of timestamps not increasing at position ${i}`);
    }
  }

  function assertFlowEnclosedInComplete(flowEvent, completeEvent) {
    if (flowEvent.ph === 's') {
      assert.equal(flowEvent.ts, completeEvent.ts + completeEvent.dur,
        `Flow should start at the end of the first complete event`);
    } else {
      assert.equal(flowEvent.ts, completeEvent.ts,
        `Flow should step and end at the beginning of the respective complete event`);
    }
  }

  const promiseResult = 42;
  async function waitABit() {
    return await new Promise(resolve => {
      setTimeout(resolve, 1, promiseResult);
    });
  }

  it('records progressing time - sanity check', async () => {
    const one = Tracing.now();
    const two = Tracing.now();
    const three = Tracing.now();

    assertTimestampsIncreasing(one, two, three);
  });

  it('traces a sync event', async () => {
    const beginMicros = Tracing.now();
    const trace = Tracing.start({cat: 'Stuff', name: 'Thingy::thing'});
    const sum = 2 + 2; // Doing some work.
    trace.end();
    const endMicros = Tracing.now();

    const events = Tracing.save().traceEvents;
    assert.lengthOf(events, 1);
    const [event] = events;
    assert.equal(event.ph, 'X');
    assert.equal(event.cat, 'Stuff');
    assert.equal(event.name, 'Thingy::thing');
    assert.isUndefined(event.args);

    assertTimestampsIncreasing(
      beginMicros,
      event.ts,
      event.ts + event.dur,
      endMicros
    );
  });

  it('sync event with endInfo', async () => {
    const trace = Tracing.start({cat: 'Stuff'});
    const sum = 2 + 2; // Doing some work.
    trace.end({name: 'Thingy::thing', args: {content: 'yay'}});

    const events = Tracing.save().traceEvents;
    assert.lengthOf(events, 1);
    const [event] = events;
    assert.equal(event.ph, 'X');
    assert.equal(event.cat, 'Stuff');
    assert.equal(event.name, 'Thingy::thing');
    assert.deepEqual(event.args, {content: 'yay'});
  });

  it('traces an asynchronous event', async () => {
    // Trace waits twice for an async operation. Visualizes as:
    // |---| → |---| → |---|
    const beginMicros = Tracing.now();
    const trace = Tracing.start({cat: 'Stuff', name: 'Thingy::thing', sequence: 'stream_1'});
    const insideFirstSync = Tracing.now();
    let promise = trace.wait(waitABit());
    const betweenFirstAndSecond = Tracing.now();
    assert.equal(await promise, promiseResult);
    const insideSecondSync = Tracing.now();
    promise = trace.wait(waitABit());
    const betweenSecondAndThird = Tracing.now();
    assert.equal(await promise, promiseResult);
    const insideThirdSync = Tracing.now();
    trace.end();
    const endMicros = Tracing.now();

    const events = Tracing.save().traceEvents;
    assert.lengthOf(events, 6);
    for (const event of events) {
      assert.equal(event.cat, 'Stuff');
      assert.equal(event.seq, 'stream_1');
      assert.isUndefined(event.args);
    }

    const flowStartEvent = events.find(e => e.ph === 's');
    const flowStepEvent = events.find(e => e.ph === 't');
    const flowEndEvent = events.find(e => e.ph === 'f');
    const completeEvents = events.filter(e => e.ph === 'X');
    assert.lengthOf(completeEvents, 3);
    completeEvents.sort((a, b) => (a.ts - b.ts));

    assert.equal(completeEvents[0].name, 'Thingy::thing');
    assert.isTrue([
      flowStartEvent,
      flowStepEvent,
      flowEndEvent,
      ...completeEvents.slice(1)
    ].every(e => e.name === 'Thingy::thing (async)'));

    assertTimestampsIncreasing(
      beginMicros,
      completeEvents[0].ts,
      insideFirstSync,
      completeEvents[0].ts + completeEvents[0].dur,
      betweenFirstAndSecond,
      completeEvents[1].ts,
      insideSecondSync,
      completeEvents[1].ts + completeEvents[1].dur,
      betweenSecondAndThird,
      completeEvents[2].ts,
      insideThirdSync,
      completeEvents[2].ts + completeEvents[2].dur,
      endMicros
    );

    assertFlowEnclosedInComplete(flowStartEvent, completeEvents[0]);
    assertFlowEnclosedInComplete(flowStepEvent, completeEvents[1]);
    assertFlowEnclosedInComplete(flowEndEvent, completeEvents[2]);

    const flowId = flowStartEvent.id;
    assert.isTrue([flowStepEvent, flowEndEvent].every(event => event.id === flowId));
    assert.isTrue(completeEvents.every(event => event.flowId === flowId));
  });

  it('traces an asynchronous event with endWith', async () => {
    const beginMicros = Tracing.now();
    const trace = Tracing.start({cat: 'Stuff', name: 'Thingy::thing'});
    const insideFirstSync = Tracing.now();
    const promise = trace.endWith(waitABit(), {args: {finished: true}});
    const betweenFirstAndSecond = Tracing.now();
    assert.equal(await promise, promiseResult);
    const endMicros = Tracing.now();

    const events = Tracing.save().traceEvents;
    assert.lengthOf(events, 4);
    for (const event of events) {
      assert.equal(event.cat, 'Stuff');
    }

    const flowStartEvent = events.find(e => e.ph === 's');
    const flowEndEvent = events.find(e => e.ph === 'f');
    const completeEvents = events.filter(e => e.ph === 'X');
    assert.lengthOf(completeEvents, 2);
    completeEvents.sort((a, b) => (a.ts - b.ts));

    assert.isUndefined(completeEvents[0].args);
    assert.deepEqual(completeEvents[1].args, {
      finished: true
    });

    assert.equal(completeEvents[0].name, 'Thingy::thing');
    assert.isTrue([
      flowStartEvent,
      flowEndEvent,
      ...completeEvents.slice(1)
    ].every(e => e.name === 'Thingy::thing (async)'));

    assertTimestampsIncreasing(
      beginMicros,
      completeEvents[0].ts,
      insideFirstSync,
      completeEvents[0].ts + completeEvents[0].dur,
      betweenFirstAndSecond,
      completeEvents[1].ts,
      completeEvents[1].ts + completeEvents[1].dur,
      endMicros
    );

    assertFlowEnclosedInComplete(flowStartEvent, completeEvents[0]);
    assertFlowEnclosedInComplete(flowEndEvent, completeEvents[1]);
  });

  it('exports an overview attribute for overview traces', async () => {
    {
      const trace = Tracing.start({cat: 'Stuff', name: 'Details'});
      await trace.wait(waitABit());
      trace.end();

      const events = Tracing.save().traceEvents;
      assert.lengthOf(events, 4);
      assert.isTrue(events.every(e => e.ov === undefined));
    }
    Tracing.__clearForTests();
    {
      const trace = Tracing.start({cat: 'Stuff', name: 'Overview', overview: true});
      await trace.wait(waitABit());
      trace.end();

      const events = Tracing.save().traceEvents;
      assert.lengthOf(events, 4);
      assert.isTrue(events.every(e => e.ov));
    }
  });

  it('assembles args for sync event', async () => {
    const trace = Tracing.start({cat: 'Stuff', name: 'Thingy::thing', args: {op: 'sum'}});
    const sum = 2 + 2;
    trace.end({args: {result: sum}});

    const [event] = Tracing.save().traceEvents;
    assert.deepEqual(event.args, {
      op: 'sum',
      result: 4
    });
  });

  it('assembles args for async event', async () => {
    const trace = Tracing.start({cat: 'Stuff', name: 'Thingy::thing', args: {step: 1}});
    await trace.wait(waitABit(), {args: {addedWhen: 'in trace.wait(...)'}});
    trace.addArgs({step: 2});
    trace.addArgs({someExtra: 'included'});
    await trace.wait(waitABit());
    trace.addArgs({step: 3});
    trace.end({args: {finished: true}});

    const completeEvents = Tracing.save().traceEvents.filter(e => e.ph === 'X');
    assert.lengthOf(completeEvents, 3);
    completeEvents.sort((a, b) => (a.ts - b.ts));

    assert.deepEqual(completeEvents[0].args, {
      step: 1,
      addedWhen: 'in trace.wait(...)'
    });
    assert.deepEqual(completeEvents[1].args, {
      step: 2,
      someExtra: 'included'
    });
    assert.deepEqual(completeEvents[2].args, {
      step: 3,
      finished: true
    });
  });

  it('allows streaming events', async () => {
    const events: TraceEvent[] = [];
    Tracing.stream(event => events.push(event));

    assert.isEmpty(events);

    Tracing.start({cat: 'Stuff', name: 'Thingy::thing'}).end();
    await Promise.resolve(); // Streaming callback is scheduled on job queue.
    assert.deepEqual(events.map(e => e.name), ['Thingy::thing']);

    Tracing.start({cat: 'Stuff', name: 'Other::thing'}).end();
    await Promise.resolve();
    assert.deepEqual(events.map(e => e.name), ['Thingy::thing', 'Other::thing']);

    Tracing.start({cat: 'Stuff', name: 'Moar::things'}).end();
    await Promise.resolve();
    assert.deepEqual(events.map(e => e.name), ['Thingy::thing', 'Other::thing', 'Moar::things']);

    assert.deepEqual(Tracing.save().traceEvents, []);
  });

  it('allows filtering while streaming', async () => {
    const events: TraceEvent[] = [];
    Tracing.stream(event => events.push(event), event => event.name === 'I\'m Special');

    assert.isEmpty(events);

    Tracing.start({cat: 'Stuff', name: 'Thingy::thing'}).end();
    await Promise.resolve(); // Streaming callback is scheduled on job queue.
    assert.deepEqual(events.map(e => e.name), []);

    Tracing.start({cat: 'Stuff', name: 'I\'m Special'}).end();
    await Promise.resolve();
    assert.deepEqual(events.map(e => e.name), ['I\'m Special']);

    Tracing.start({cat: 'Stuff', name: 'Moar::things'}).end();
    await Promise.resolve();
    assert.deepEqual(events.map(e => e.name), ['I\'m Special']);
  });

  it('traces flow events', async () => {
    const beginMicros = Tracing.now();
    const flow = Tracing.flow({cat: 'Stuff', name: 'Flowing'}).start();
    const betweenStartAndStepMicros = Tracing.now();
    flow.step();
    const betweenStepAndFinishMicros = Tracing.now();
    flow.end();
    const endMicros = Tracing.now();

    const events = Tracing.save().traceEvents;
    assert.lengthOf(events, 3);
    for (const event of events) {
      assert.equal(event.cat, 'Stuff');
      assert.equal(event.name, 'Flowing');
    }

    const flowStartEvent = events.find(e => e.ph === 's');
    const flowStepEvent = events.find(e => e.ph === 't');
    const flowEndEvent = events.find(e => e.ph === 'f');

    assertTimestampsIncreasing(
      beginMicros,
      flowStartEvent.ts,
      betweenStartAndStepMicros,
      flowStepEvent.ts,
      betweenStepAndFinishMicros,
      flowEndEvent.ts,
      endMicros
    );
  });
});
