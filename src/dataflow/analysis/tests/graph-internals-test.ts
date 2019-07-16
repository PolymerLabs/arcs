/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Flow, FlowModifier, TagOperation, FlowCheck, FlowSet} from '../graph-internals';
import {assert} from '../../../platform/chai-web.js';
import {TestEdge, TestNode} from '../testing/flow-graph-testing';
import {ClaimIsTag} from '../../../runtime/particle-claim';

describe('Flow', () => {
  it('starts empty', () => {
    const flow = new Flow();
    assert.isEmpty(flow.nodeIds);
    assert.isEmpty(flow.edgeIds);
    assert.isEmpty(flow.tags);
  });

  describe('modify', () => {
    it('adds node and edge IDs', () => {
      const modifier = new FlowModifier();
      modifier.nodeIds.add('N1');
      modifier.nodeIds.add('N2');
      modifier.edgeIds.add('E1');
      modifier.edgeIds.add('E2');
      
      const flow = new Flow();
      flow.modify(modifier);

      assert.hasAllDeepKeys(flow.nodeIds, ['N1', 'N2']);
      assert.hasAllDeepKeys(flow.edgeIds, ['E1', 'E2']);
    });

    it('adds and removes tags', () => {
      const modifier1 = new FlowModifier();
      modifier1.tagOperations.set('a', TagOperation.Add);
      modifier1.tagOperations.set('b', TagOperation.Add);
      
      const flow = new Flow();
      flow.modify(modifier1);

      assert.hasAllDeepKeys(flow.tags, ['a', 'b']);

      const modifier2 = new FlowModifier();
      modifier2.tagOperations.set('b', TagOperation.Remove);
      modifier2.tagOperations.set('c', TagOperation.Add);
  
      flow.modify(modifier2);

      assert.hasAllDeepKeys(flow.tags, ['a', 'c']);
    });
  });
  
  describe('evaluateCheck', () => {
    it('checks node IDs', () => {
      const check: FlowCheck = {type: 'node', value: 'N1'};
      const flow = new Flow();
      
      flow.tags.add('N1');
      flow.edgeIds.add('N1');
      assert.isFalse(flow.evaluateCheck(check));

      flow.nodeIds.add('N1');
      assert.isTrue(flow.evaluateCheck(check));
    });

    it('checks edge IDs', () => {
      const check: FlowCheck = {type: 'edge', value: 'E1'};
      const flow = new Flow();

      flow.tags.add('E1');
      flow.nodeIds.add('E1');
      assert.isFalse(flow.evaluateCheck(check));

      flow.edgeIds.add('E1');
      assert.isTrue(flow.evaluateCheck(check));
    });

    it('checks tags', () => {
      const check: FlowCheck = {type: 'tag', value: 't'};
      const flow = new Flow();

      flow.nodeIds.add('t');
      flow.edgeIds.add('t');
      assert.isFalse(flow.evaluateCheck(check));

      flow.tags.add('t');
      assert.isTrue(flow.evaluateCheck(check));
    });

    it(`handles 'or' operators`, () => {
      const check: FlowCheck = {operator: 'or', children: [{type: 'tag', value: 't1'}, {type: 'tag', value: 't2'}]};
      const flow = new Flow();
      flow.tags.add('t1');
      assert.isTrue(flow.evaluateCheck(check));

      flow.tags.add('t2');
      assert.isTrue(flow.evaluateCheck(check));
    });

    it(`handles 'and' operators`, () => {
      const check: FlowCheck = {operator: 'and', children: [{type: 'tag', value: 't1'}, {type: 'tag', value: 't2'}]};
      const flow = new Flow();
      flow.tags.add('t1');
      assert.isFalse(flow.evaluateCheck(check));

      flow.tags.add('t2');
      assert.isTrue(flow.evaluateCheck(check));
    });
    
    it(`handles nested 'or' and 'and' operators`, () => {
      const check: FlowCheck = {operator: 'and', children: [
        {type: 'tag', value: 't1'},
        {operator: 'or', children: [
          {type: 'tag', value: 't2'},
          {type: 'tag', value: 't3'}
        ]},
      ]};

      // Runs evaluateCheck for a flow with the given tags.
      const checkWithTags = (...tags: string[]) => {
        const flow = new Flow();
        tags.forEach(t => flow.tags.add(t));
        return flow.evaluateCheck(check);
      };

      assert.isFalse(checkWithTags('t1'));
      assert.isTrue(checkWithTags('t1', 't2'));
      assert.isTrue(checkWithTags('t1', 't3'));
      assert.isFalse(checkWithTags('t2', 't3'));
    });
  });

  it('can create a copy', () => {
    const original = new Flow();
    original.nodeIds.add('N1');
    original.edgeIds.add('E1');
    original.tags.add('t1');

    const copy = original.copy();
    assert.deepEqual(original, copy);

    assert.notStrictEqual(original.nodeIds, copy.nodeIds);
    assert.notStrictEqual(original.edgeIds, copy.edgeIds);
    assert.notStrictEqual(original.tags, copy.tags);
  });

  it('can create a modified copy', () => {
    const modifier = FlowModifier.fromConditions(
        {type: 'edge', value: 'E1'},
        {type: 'node', value: 'N1'},
        {type: 'tag', value: 't1'});
    const original = new Flow();

    const copy = original.copyAndModify(modifier);
    
    assert.hasAllDeepKeys(copy.nodeIds, ['N1']);
    assert.hasAllDeepKeys(copy.edgeIds, ['E1']);
    assert.hasAllDeepKeys(copy.tags, ['t1']);
    assert.isEmpty(original.nodeIds);
    assert.isEmpty(original.edgeIds);
    assert.isEmpty(original.tags);
  });

  it('has a unique string representation', () => {
    const flow = new Flow();
    flow.nodeIds.add('N1');
    flow.nodeIds.add('N2');
    flow.edgeIds.add('E1');
    flow.edgeIds.add('E2');
    flow.tags.add('t1');
    flow.tags.add('t2');
    
    assert.strictEqual(flow.toUniqueString(), '{edge:E1, edge:E2, node:N1, node:N2, tag:t1, tag:t2}');
  });
});

describe('FlowModifier', () => {
  it('creates an empty modifier from an empty list of conditions', () => {
    const modifier = FlowModifier.fromConditions();
    assert.isEmpty(modifier.edgeIds);
    assert.isEmpty(modifier.nodeIds);
    assert.isEmpty(modifier.tagOperations);
  });

  it('can be created from a list of conditions', () => {
    const modifier = FlowModifier.fromConditions(
        {type: 'edge', value: 'E1'},
        {type: 'edge', value: 'E2'},
        {type: 'node', value: 'N1'},
        {type: 'node', value: 'N2'},
        {type: 'tag', value: 't1'},
        {type: 'tag', value: 't2'});
    
    assert.hasAllDeepKeys(modifier.edgeIds, ['E1', 'E2']);
    assert.hasAllDeepKeys(modifier.nodeIds, ['N1', 'N2']);
    assert.deepEqual(modifier.tagOperations, new Map([['t1', TagOperation.Add], ['t2', TagOperation.Add]]));
  });
  
  it('can be created from an edge and an empty list of claims', () => {
    const edge = new TestEdge(new TestNode('A'), new TestNode('B'), 'AB');

    const modifier = FlowModifier.fromClaims(edge, []);

    assert.hasAllDeepKeys(modifier.edgeIds, ['AB']);
    assert.hasAllDeepKeys(modifier.nodeIds, ['A']);
    assert.isEmpty(modifier.tagOperations);
  });

  it('can be created from an edge and a list of claims', () => {
    const edge = new TestEdge(new TestNode('A'), new TestNode('B'), 'AB');
    const claim1 = new ClaimIsTag(/* isNot= */ false, 't1');
    const claim2 = new ClaimIsTag(/* isNot= */ true, 't2');

    const modifier = FlowModifier.fromClaims(edge, [claim1, claim2]);
    
    assert.hasAllDeepKeys(modifier.edgeIds, ['AB']);
    assert.hasAllDeepKeys(modifier.nodeIds, ['A']);
    assert.deepEqual(modifier.tagOperations, new Map([['t1', TagOperation.Add], ['t2', TagOperation.Remove]]));
  });

  it('can be converted into a Flow object', () => {
    const modifier = FlowModifier.fromConditions(
        {type: 'edge', value: 'E1'},
        {type: 'node', value: 'N1'},
        {type: 'tag', value: 't1'});
    
    const flow = modifier.toFlow();

    assert.hasAllDeepKeys(flow.edgeIds, ['E1']);
    assert.hasAllDeepKeys(flow.nodeIds, ['N1']);
    assert.hasAllDeepKeys(flow.tags, ['t1']);
  });
  
  it('can create a copy', () => {
    const original = FlowModifier.fromConditions(
        {type: 'edge', value: 'E1'},
        {type: 'node', value: 'N1'},
        {type: 'tag', value: 't1'});

    const copy = original.copy();
    assert.deepEqual(original, copy);

    assert.notStrictEqual(original.nodeIds, copy.nodeIds);
    assert.notStrictEqual(original.edgeIds, copy.edgeIds);
    assert.notStrictEqual(original.tagOperations, copy.tagOperations);
  });

  it('can create a modified copy', () => {
    const original = FlowModifier.fromConditions(
        {type: 'edge', value: 'E1'},
        {type: 'node', value: 'N1'},
        {type: 'tag', value: 't1'});
    const modifier = FlowModifier.fromConditions(
        {type: 'edge', value: 'E2'},
        {type: 'node', value: 'N2'},
        {type: 'tag', value: 't2'});

    const copy = original.copyAndModify(modifier);
    
    assert.hasAllDeepKeys(original.nodeIds, ['N1']);
    assert.hasAllDeepKeys(original.edgeIds, ['E1']);
    assert.deepEqual(original.tagOperations, new Map([['t1', TagOperation.Add]]));

    assert.hasAllDeepKeys(copy.nodeIds, ['N1', 'N2']);
    assert.hasAllDeepKeys(copy.edgeIds, ['E1', 'E2']);
    assert.deepEqual(copy.tagOperations, new Map([['t1', TagOperation.Add], ['t2', TagOperation.Add]]));
  });

  it('has a unique string representation', () => {
    const modifier = FlowModifier.fromConditions(
        {type: 'node', value: 'N1'},
        {type: 'node', value: 'N2'},
        {type: 'edge', value: 'E1'},
        {type: 'edge', value: 'E2'},
        {type: 'tag', value: 't1'},
        {type: 'tag', value: 't2'});
    modifier.tagOperations.set('t2', TagOperation.Remove);
    
    assert.strictEqual(modifier.toUniqueString(), '{+edge:E1, +edge:E2, +node:N1, +node:N2, +tag:t1, -tag:t2}');
  });
});
