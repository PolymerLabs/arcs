/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Refiner, Segment} from '../refiner.js';
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
        const ref = manifestAst[0].args[0].type.fields[0].type.refinement;
        const data = {
            num: 6
        };
        const res = Refiner.isValidData(ref, data);
        assert.strictEqual(res, data.num === 0 || data.num === 6);
    });
    it('Throws error when field name not found.', () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ num < num2 ] }
            `);
            const ref = manifestAst[0].args[0].type.fields[0].type.refinement;
            const data = {
                num: 6,
            };
            const _ = Refiner.isValidData(ref, data);
        }, `Unresolved field name 'num2' in the refinement expression.\n`);
    });
    it('Throws error when expression does not produce boolean result.', () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ num + 5 ] }
            `);
            const ref = manifestAst[0].args[0].type.fields[0].type.refinement;
            const data = {
                num: 6,
            };
            const _ = Refiner.isValidData(ref, data);
        }, `Refinement expression evaluated to a non-boolean type.\n`);
    });
    it('Throws error when operators and operands are incompatible.', () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ (num < 5) + 3 == 0 ] }
            `);
            const ref = manifestAst[0].args[0].type.fields[0].type.refinement;
            const data = {
                num: 6,
            };
            const _ = Refiner.isValidData(ref, data);
        }, `Got type boolean. Expected number.\n`);
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ (num and 3) == 0 ] }
            `);
            const ref = manifestAst[0].args[0].type.fields[0].type.refinement;
            const data = {
                num: 6,
            };
            const _ = Refiner.isValidData(ref, data);
        }, `Got type number. Expected boolean.\n`);
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
});
