/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Refiner, Segment, Refinement} from '../refiner.js';
import {Range} from '../refiner.js';
import {parse} from '../../gen/runtime/manifest-parser.js';
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {Entity, EntityClass} from '../entity.js';
import {Schema} from '../schema.js';
import {Flags} from '../flags.js';

describe('refiner', () => {
    it('Refines data given an expression.', () => {
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ (num/-3 < 0 and num*num == 36) or num == 0 ] }
        `);
        const typeData = {}; typeData['num'] = 'Number';
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const data = {
            num: 6
        };
        const res = ref.validateData(data);
        assert.strictEqual(res, data.num === 0 || data.num === 6);
    });
    it('Throws error when field name not found.', () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ num < num2 ] }
            `);
            const typeData = {}; typeData['num'] = 'Number';
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            const _ = ref.validateData(data);
        }, `Unresolved field name 'num2' in the refinement expression.`);
    });
    it('Throws error when expression does not produce boolean result.', () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ num + 5 ] }
            `);
            const typeData = {}; typeData['num'] = 'Number';
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            const _ = ref.validateData(data);
        }, `Refinement expression evaluated to a non-boolean type.\n`);
    });
    it('Throws error when operators and operands are incompatible.', () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ (num < 5) + 3 == 0 ] }
            `);
            const typeData = {}; typeData['num'] = 'Number';
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            const _ = ref.validateData(data);
        }, `Got type Boolean. Expected Number.`);
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ (num and 3) == 0 ] }
            `);
            const typeData = {}; typeData['num'] = 'Number';
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            const _ = ref.validateData(data);
        }, `Got type Number. Expected Boolean.`);
    });
    it('tests expression to range conversion.', () => {
        let manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ ((num < 3) and (num > 0)) or (num == 5) ] }
        `);
        let expr = manifestAst[0].args[0].type.fields[0].type.refinement.expression;
        let range = Range.fromExpression(expr);
        assert.deepEqual(range.segments, [Segment.openOpen(0, 3), Segment.closedClosed(5, 5)]);
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [(num > 10) == (num >= 20)] }
        `);
        expr = manifestAst[0].args[0].type.fields[0].type.refinement.expression;
        range = Range.fromExpression(expr);
        assert.deepEqual(range.segments, [Segment.openClosed(Number.NEGATIVE_INFINITY, 10), Segment.closedOpen(20, Number.POSITIVE_INFINITY)]);
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [not (num != 10)] }
        `);
        expr = manifestAst[0].args[0].type.fields[0].type.refinement.expression;
        range = Range.fromExpression(expr);
        assert.deepEqual(range.segments, [Segment.closedClosed(10, 10)]);

    });
});


describe('refiner', () => {
    let schema: Schema;
    let entityClass: EntityClass;
    before(async () => {
      const manifest = await Manifest.parse(`
        schema Foo
          txt: Text
          num: Number [num < 10]
          flg: Boolean
      `);
      schema = manifest.schemas.Foo;
      entityClass = Entity.createEntityClass(schema, null);
    });

    it('data does not conform to the refinement', Flags.whileEnforcingRefinements(async () => {
      assert.throws(() => { const e = new entityClass({txt: 'abc', num: 56}); }, `Entity schema field 'num' does not conform to the refinement.`);
    }));

    it('data does conform to the refinement', Flags.whileEnforcingRefinements(async () => {
        assert.doesNotThrow(() => { const e = new entityClass({txt: 'abc', num: 8}); });
      }));
});

describe('Range', () => {
    it('tests union operations on a range', () => {
        const range1 = new Range();
        // range1 = [];
        assert.strictEqual(range1.segments.length, 0);
        range1.unionWithSeg(Segment.closedClosed(0, 10));
        // range1 = [0, 10];
        assert.deepEqual(range1.segments, [Segment.closedClosed(0, 10)]);
        range1.unionWithSeg(Segment.openClosed(20, 30));
        // range1 = [0, 10] U (20,30];
        assert.deepEqual(range1.segments, [Segment.closedClosed(0, 10), Segment.openClosed(20, 30)]);
        range1.unionWithSeg(Segment.closedOpen(5, 15));
        // range1 = [0, 15) U (20,30];
        assert.deepEqual(range1.segments, [Segment.closedOpen(0, 15), Segment.openClosed(20, 30)]);
        const range2 = new Range();
        range2.segments = [Segment.closedClosed(-1, -1), Segment.closedClosed(5, 7), Segment.openClosed(15, 19)];
        // range2 = [-1, -1] U [5, 7] U (15,19];
        range1.union(range2);
        // range1 = [-1, -1] U [0, 15) U (15, 19] U (20, 30]
        assert.deepEqual(range1.segments, [Segment.closedClosed(-1, -1), Segment.closedOpen(0, 15), Segment.openClosed(15, 19), Segment.openClosed(20, 30)]);
    });
    it('tests intersection operations on a range', () => {
        const range1 = new Range();
        range1.segments = [Segment.closedClosed(0, 10), Segment.closedClosed(20, 30)];
        // range1 = [0, 10] U [20,30];
        range1.intersectWithSeg(Segment.openOpen(5, 25));
        // range1 = (5, 10] U [20, 25);
        assert.deepEqual(range1.segments, [Segment.openClosed(5, 10), Segment.closedOpen(20, 25)]);
        range1.intersectWithSeg(Segment.closedOpen(5, 15));
        // range1 = (5, 10];
        assert.deepEqual(range1.segments, [Segment.openClosed(5, 10)]);
        const range2 = new Range();
        range2.segments = [Segment.closedClosed(-1, -1), Segment.closedOpen(4, 10), Segment.closedClosed(13, 19)];
        // range2 = [-1, -1] U [4, 10) U [13,19];
        range1.intersect(range2);
        // range1 = (5, 10);
        assert.deepEqual(range1.segments, [Segment.openOpen(5, 10)]);
    });
    it('tests if a range is a subset of another', () => {
        const range1 = Range.infiniteRange();
        // range1 = (-inf, +inf)
        const range2 = new Range();
        range2.segments = [Segment.closedClosed(0, 10), Segment.closedClosed(20, 30)];
        // range2 = [0, 10] U [20,30];
        assert.isTrue(range2.isSubsetOf(range1));
        range1.segments = [Segment.closedClosed(0, 10), Segment.closedClosed(20, 30)];
        // range1 = [0, 10] U [20,30];
        assert.isTrue(range2.isSubsetOf(range1));
        range1.segments = [Segment.closedClosed(0, 10), Segment.closedClosed(22, 30)];
        // range1 = [0, 10] U [22,30];
        assert.isFalse(range2.isSubsetOf(range1));
        range1.segments = [];
        // range1 = [];
        assert.isTrue(range1.isSubsetOf(range2));
        range1.segments = [Segment.closedOpen(0, 10), Segment.closedClosed(20, 30)];
        // range1 = [0, 10) U [20,30];
        assert.isTrue(range1.isSubsetOf(range2));
    });
    it('tests the difference of ranges', () => {
        const range1 = Range.infiniteRange();
        // range1 = (-inf, +inf)
        const range2 = new Range();
        range2.segments = [Segment.closedClosed(0, 10), Segment.closedClosed(20, 30)];
        // range2 = [0, 10] U [20,30];
        let diff = Range.difference(range1, range2);
        // diff = (-inf, 0) U (10,20) U (30, inf)
        assert.deepEqual(diff.segments, [Segment.openOpen(Number.NEGATIVE_INFINITY, 0), Segment.openOpen(10, 20), Segment.openOpen(30, Number.POSITIVE_INFINITY)]);
        range1.segments = [Segment.closedOpen(0, 20), Segment.openClosed(40, 50)];
        // range1 = [0,20) U (40, 50]
        range2.segments = [Segment.openOpen(0, 5), Segment.closedOpen(7, 12), Segment.closedClosed(15, 43), Segment.openClosed(45, 50)];
        // range2 = (0,5) U [7,12) U [15, 43] U (45, 50]
        diff = Range.difference(range1, range2);
        // diff = [0, 0] U [5,7) U [12,15) U (43, 45]
        assert.deepEqual(diff.segments, [Segment.closedClosed(0, 0), Segment.closedOpen(5, 7), Segment.closedOpen(12, 15), Segment.openClosed(43, 45)]);
    });
});
