/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Primitive, NumberRange, NumberSegment, Refinement, BinaryExpression, NumberMultinomial, NumberFraction, NumberTerm, BigIntTerm, BigIntRange, BigIntFraction, BigIntMultinomial, BigIntSegment, Normalizer} from '../refiner.js';
import {parse} from '../../gen/runtime/manifest-parser.js';
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {Entity, EntityClass} from '../entity.js';
import {Schema} from '../schema.js';
import {Flags} from '../flags.js';

describe('refiner', () => {
    it('Refines data given an expression 1', Flags.withFieldRefinementsAllowed(async () => {
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ (num/-3 < 0 and num*num == 36) or num == 0 ]}
        `);
        const typeData = {'num': 'Number'};
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const data = {
            num: 6
        };
        const res = ref.validateData(data);
        assert.strictEqual(res, data.num === 0 || data.num === 6);
    }));
    it('Refines data given an expression 2', () => {
      const manifestAst = parse(`
          particle Foo
              input: reads Something {num: Number} [(num/-3 < 0 and num*num == 36) or num == 0]
      `);
      const typeData = {'num': 'Number'};
      const ref = Refinement.fromAst(manifestAst[0].args[0].type.refinement, typeData);
      const data = {
          num: 6
      };
      const res = ref.validateData(data);
      assert.strictEqual(res, data.num === 0 || data.num === 6);
  });
    it('Throws error when field name not found 1', Flags.withFieldRefinementsAllowed(async () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ num < num2 ]}
            `);
            const typeData = {'num': 'Number'};
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            ref.validateData(data);
        }, `Unresolved field name 'num2' in the refinement expression.`);
    }));
    it('Throws error when field name not found 2', () => {
      assert.throws(() => {
          const manifestAst = parse(`
              particle Foo
                  input: reads Something {num: Number} [num < num2]
          `);
          const typeData = {'num': 'Number'};
          const ref = Refinement.fromAst(manifestAst[0].args[0].type.refinement, typeData);
          const data = {
              num: 6,
          };
          ref.validateData(data);
      }, `Unresolved field name 'num2' in the refinement expression.`);
  });
    it('Throws error when expression does not produce boolean result', Flags.withFieldRefinementsAllowed(async () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ num + 5 ]}
            `);
            const typeData = {'num': 'Number'};
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            ref.validateData(data);
        }, `Refinement expression (num + 5) evaluated to a non-boolean type.`);
    }));
    it('Throws error when operators and operands are incompatible: Number', Flags.withFieldRefinementsAllowed(async () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ (num < 5) + 3 == 0 ]}
            `);
            const typeData = {'num': 'Number'};
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            ref.validateData(data);
        }, `Refinement expression (num < 5) has type Boolean. Expected Number.`);
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ (num and 3) == 0 ]}
            `);
            const typeData = {'num': 'Number'};
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            ref.validateData(data);
        }, `Refinement expression num has type Number. Expected Boolean.`);
        assert.throws(() => {
          const manifestAst = parse(`
              particle Foo
                  input: reads Something {name: Text [ name > 'Ragav' ]}
          `);
          const typeData = {'name': 'Text'};
          const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
          const data = {
              name: 'Josh',
          };
            ref.validateData(data);
        }, `Refinement expression name has type Text. Expected Number or BigInt.`);
    }));
    it('Throws error when operators and operands are incompatible: BigInt', Flags.withFieldRefinementsAllowed(async () => {
      const validate = (data, relation: string) => {
        const manifest = `
        particle Foo
            input: reads Something {num: BigInt [ ${relation} ]}`;
        const manifestAst = parse(manifest);
        const typeData = {'num': 'BigInt'};
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        return ref.validateData(data);
      };
      assert.isTrue(validate({num: BigInt(6)}, `(num - 6n) == 0n`), 'this should be valid');
      assert.throws(() => {
          validate({num: BigInt(6)}, `(num < 5n) + 3n == 0n`);
      }, `Refinement expression (num < 5n) has type Boolean. Expected BigInt.`);
      assert.throws(() => {
          validate({num: BigInt(6)}, `(num + 3) == 0n`);
      }, `Refinement expression num has type BigInt. Expected Number.`);
      assert.throws(() => {
          validate({num: 6}, `(num + 3) == 0n`);
      }, `Refinement expression num has type BigInt. Expected Number.`);
      assert.throws(() => {
          validate({num: 6}, `(num + 3) == 0n`);
      }, `Refinement expression num has type BigInt. Expected Number.`);
      assert.throws(() => {
          validate({num: 6}, `(num and 3) == 0`);
      }, `Refinement expression num has type BigInt. Expected Boolean.`);
    }));
    it('tests simple expression to range conversion', Flags.withFieldRefinementsAllowed(async () => {
      const validate = (refinement, segments: NumberSegment[]) => {
        const typeData = {'num': 'Number'};
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ ${refinement} ]}
        `);
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const range = NumberRange.fromExpression(ref.expression);
        assert.deepEqual(range, new NumberRange(segments));
      };
        validate(`num < 3`, [NumberSegment.closedOpen(Number.NEGATIVE_INFINITY, 3)]);
        validate(`num > 10`, [NumberSegment.openClosed(10, Number.POSITIVE_INFINITY)]);
        validate(`not (num != 10)`, [NumberSegment.closedClosed(10, 10)]);
        validate(`(num != 10)`, [
          NumberSegment.closedOpen(Number.NEGATIVE_INFINITY, 10),
          NumberSegment.openClosed(10, Number.POSITIVE_INFINITY)
        ]);
    }));
    it('tests simple expression to range conversions using bigint 1', Flags.withFieldRefinementsAllowed(async () => {
        const typeData = {'num': 'BigInt'};
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: BigInt [ num < 3n ]}
        `);
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const range = BigIntRange.fromExpression(ref.expression);
        assert.deepEqual(range, new BigIntRange([BigIntSegment.closedOpen('NEGATIVE_INFINITY', BigInt(3))]));
    }));
    it('tests simple expression to range conversions using bigint 2', Flags.withFieldRefinementsAllowed(async () => {
        const typeData = {'num': 'BigInt'};
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: BigInt [(num > 10n)]}
        `);
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const range = BigIntRange.fromExpression(ref.expression);
        assert.deepEqual(range, new BigIntRange([BigIntSegment.openClosed(BigInt(10), 'POSITIVE_INFINITY')]));
    }));
    it('tests complement BigIntRange', Flags.withFieldRefinementsAllowed(async () => {
      const ten = BigInt(10);
      const singleValue = new BigIntRange([BigIntSegment.closedClosed(ten, ten)]);
      assert.deepEqual(singleValue.segmentsForTesting(), [
        {from: {val: ten, isOpen: false}, to: {val: ten, isOpen: false}}
      ]);
      const not10 = singleValue.complement();
      const notNot10 = not10.complement();
      assert.deepEqual(singleValue, notNot10);
      assert.deepEqual(not10.segmentsForTesting(), [
        {from: {val: 'NEGATIVE_INFINITY', isOpen: false}, to: {val: ten, isOpen: true}},
        {from: {val: ten, isOpen: true}, to: {val: 'POSITIVE_INFINITY', isOpen: false}},
      ]);
    }));
    it('tests simple expression to range conversions using bigint 3', Flags.withFieldRefinementsAllowed(async () => {
        const typeData = {'num': 'BigInt'};
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: BigInt [not (num != 10n)]}
        `);
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const range = BigIntRange.fromExpression(ref.expression);
        assert.deepEqual(range, new BigIntRange([BigIntSegment.closedClosed(BigInt(10), BigInt(10))]));
    }));
    it('tests expression to range conversion 1', Flags.withFieldRefinementsAllowed(async () => {
        const typeData = {'num': 'Number'};
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ (num < 3) and (num > 0) ]}
        `);
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const range = NumberRange.fromExpression(ref.expression);
        assert.deepEqual(range, new NumberRange([NumberSegment.openOpen(0, 3)]));
    }));
    it('tests expression to range conversion 2', Flags.withFieldRefinementsAllowed(async () => {
        const typeData = {'num': 'Number'};
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ ((num < 3) and (num > 0)) or (num == 5) ]}
        `);
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const range = NumberRange.fromExpression(ref.expression);
        assert.deepEqual(range, new NumberRange([NumberSegment.openOpen(0, 3), NumberSegment.closedClosed(5, 5)]));
    }));
    it('tests expression to range conversion 3', Flags.withFieldRefinementsAllowed(async () => {
        const typeData = {'num': 'Number'};
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [(num > 10) == (num >= 20)]}
        `);
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const range = NumberRange.fromExpression(ref.expression);
        assert.deepEqual(range, new NumberRange([NumberSegment.closedClosed(Number.NEGATIVE_INFINITY, 10), NumberSegment.closedClosed(20, Number.POSITIVE_INFINITY)]));
    }));
    it('tests expression to range conversion 4', Flags.withFieldRefinementsAllowed(async () => {
        const typeData = {'num': 'Number'};
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [not (num != 10)]}
        `);
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const range = NumberRange.fromExpression(ref.expression);
        assert.deepEqual(range, new NumberRange([NumberSegment.closedClosed(10, 10)]));

    }));
    it('regression test for parse failure on operator ordering', () => {
      parse(`
      particle Foo
          input: reads Something {num: Number} [num <= 20]
      `);
  });

  describe('refiner enforcement', () => {
      let schema: Schema;
      let entityClass: EntityClass;
      let exceptions: Error[] = [];
      beforeEach(Flags.withFieldRefinementsAllowed(async () => {
        exceptions = [];
        const manifest = await Manifest.parse(`
          schema Foo
            txt: Text
            num: Number [num < 10]
            int: BigInt [int < 10n]
            flg: Boolean
        `);
        schema = manifest.schemas.Foo;
        const reportExceptionInHost = (error: Error) => {exceptions.push(error);};
        // tslint:disable-next-line: no-any
        entityClass = Entity.createEntityClass(schema, {reportExceptionInHost} as any);
      }));
      it('data does not conform to num refinement', Flags.whileEnforcingRefinements(async () => {
        const _ = new entityClass({txt: 'abc', num: 56, int: BigInt(5)});
        assert.lengthOf(exceptions, 1);
        exceptions.map(except => {
          assert.deepEqual(except.message, `AuditException: exception Error raised when invoking function Refinement:refineData on particle undefined: Entity schema field 'num' does not conform to the refinement [(num < 10)]`);
        });
      }));
      it('data does not conform to int refinement', Flags.whileEnforcingRefinements(async () => {
        const _ = new entityClass({txt: 'abc', num: 5, int: BigInt(56)});
        assert.lengthOf(exceptions, 1);
        exceptions.map(except => {
          assert.deepEqual(except.message, `AuditException: exception Error raised when invoking function Refinement:refineData on particle undefined: Entity schema field 'int' does not conform to the refinement [(int < 10n)]`);
        });
      }));
      it('data does conform to the refinement', Flags.whileEnforcingRefinements(async () => {
        assert.doesNotThrow(() => { const _ = new entityClass({txt: 'abc', num: 8, int: BigInt(5)});});
      }));
  });

  describe('dynamic refinements', () => {
      describe('Parses and type checks a particle with dynamic refinements', Flags.withFieldRefinementsAllowed(async () => {
          let ref: Refinement;
          before(Flags.withFieldRefinementsAllowed(async () => {
            const manifestAst = parse(`
              particle AddressBook
                contacts: reads [Contact {name: Text [ name == ? ]}]
            `);
            const typeData = {'name': 'Text'};
            const contacts = manifestAst[0].args[0];
            const nameType = contacts.type.type.fields[0].type;
            ref = Refinement.fromAst(nameType.refinement, typeData);
          }));
          it('field names, query argument names and query argument types', () => {
            assert.deepEqual(JSON.stringify([...ref.expression.getFieldParams()]), '[["name","Text"]]', 'should infer indexes from refinement');
            assert.deepEqual(JSON.stringify([...ref.expression.getQueryParams()]), '[["?","Text"]]', 'should infer query args from refinement');
            assert.strictEqual(ref.toString(), '[(name == ?)]');
          });
          it('the algorithm discovers the type', () => {
            const dyn = (ref.expression as BinaryExpression).rightExpr;
            assert.equal(dyn.evalType, 'Text');
          });
          it('without the query param', () => {
            const data = {
                name: 'Ghost Busters'
            };
            assert.isTrue(ref.validateData(data), 'Data is valid');
          });
          it('with the query param', () => {
            const dataWithQuery = {
                name: 'Ghost Busters',
                '?': 'Not Ghost Busters',
            };
            assert.isFalse(ref.validateData(dataWithQuery), 'Data is not valid');
          });
      }));
      describe('Parses and type checks a particle with dynamic and static refinements', () => {
          let ref: Refinement;
          before(Flags.withFieldRefinementsAllowed(async () => {
            const manifestAst = parse(`
              particle AddressBook
                contacts: reads [Contact {name: Text, age: Number} [ name == ?  and age > 10]]
            `);
            const typeData = {'name': 'Text', 'age': 'Number'};
            const contacts = manifestAst[0].args[0];
            ref = Refinement.fromAst(contacts.type.type.refinement, typeData);
          }));
          it('field names, query argument names and query argument types', () => {
            assert.deepEqual(JSON.stringify([...ref.expression.getFieldParams()]), '[["name","Text"],["age","Number"]]', 'should infer indexes from refinement');
            assert.deepEqual(JSON.stringify([...ref.expression.getQueryParams()]), '[["?","Text"]]', 'should infer query args from refinement');
            assert.strictEqual(ref.toString(), '[((name == ?) and (age > 10))]');
          });
          it('the algorithm discovers the type', () => {
            const dyn = ((ref.expression as BinaryExpression).leftExpr as BinaryExpression).rightExpr;
            assert.equal(dyn.evalType, 'Text');
          });
          it('without the query param and a valid age', () => {
            const data = {
                name: 'Ghost Busters',
                age: 20,
            };
            assert.isTrue(ref.validateData(data), 'Data is valid');
          });
          it('with the query param and a valid age', () => {
            const data = {
                name: 'Ghost Busters',
                '?': 'Not Ghost Busters',
                age: 20,
            };
            assert.isFalse(ref.validateData(data), 'Data is not valid');
          });
          it('without the query param and an invalid age', () => {
            const data = {
                name: 'Ghost Busters',
                age: 2,
            };
            assert.isFalse(ref.validateData(data), 'Data is not valid');
          });
          it('with the query param and an invalid age', () => {
            const data = {
                name: 'Ghost Busters',
                '?': 'Not Ghost Busters',
                age: 2,
            };
            assert.isFalse(ref.validateData(data), 'Data is not valid');
          });
      });
  });

  describe('normalisation', () => {
    it('tests if field name is rearranged to left in a binary node', Flags.withFieldRefinementsAllowed(async () => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: Number [ (10+2) > num ]}
        `);
        const typeData = {'num': 'Number'};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
        ref1.normalize();
        const manifestAst2 = parse(`
            particle Foo
                input: reads Something {num: Number [ num < 12 ]}
        `);
        const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
        // normalized version of ref1 should be the same as ref2
        assert.strictEqual(ref1.toString(), ref2.toString());
    }));
    it('tests if primitive boolean expressions are automatically evaluated', Flags.withFieldRefinementsAllowed(async () => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: Boolean [ num == not (true or false) ]}
        `);
        const typeData = {'num': 'Boolean'};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
        ref1.normalize();
        const manifestAst2 = parse(`
            particle Foo
                input: reads Something {num: Boolean [ not num ]}
        `);
        const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
        // normalized version of ref1 should be the same as ref2
        assert.strictEqual(ref1.toString(), ref2.toString());
    }));
    it('tests if primitive math expressions are automatically evaluated', Flags.withFieldRefinementsAllowed(async () => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: Number [ (2+11-9) > num or False ]}
        `);
        const typeData = {'num': 'Number'};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
        ref1.normalize();
        const manifestAst2 = parse(`
            particle Foo
                input: reads Something {num: Number [ num < 4 ]}
        `);
        const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
        // normalized version of ref1 should be the same as ref2
        assert.strictEqual(ref1.toString(), ref2.toString());
    }));
    it(`tests if multiple 'not's are cancelled. `, Flags.withFieldRefinementsAllowed(async () => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: Boolean [ not (not num) ]}
        `);
        const typeData = {'num': 'Boolean'};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
        ref1.normalize();
        const manifestAst2 = parse(`
            particle Foo
                input: reads Something {num: Boolean [ num ]}
        `);
        const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
        // normalized version of ref1 should be the same as ref2
        assert.strictEqual(ref1.toString(), ref2.toString());
    }));
    it(`tests if expressions are rearranged 0`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ (num + 5) <= 0 ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
      ref1.normalize();
      const manifestAst2 = parse(`
          particle Foo
              input: reads Something {num: Number [ num <= -5 ]}
      `);
      const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
      ref2.normalize();
      // normalized version of ref1 should be the same as ref2
      assert.strictEqual(ref1.toString(), ref2.toString());
      assert.deepEqual(ref1, ref2);
    }));
    it(`tests if expressions are rearranged 1`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ num <= -5 ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
      ref1.normalize();
      const manifestAst2 = parse(`
          particle Foo
              input: reads Something {num: Number [ -5 >= num ]}
      `);
      const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
      ref2.normalize();
      // normalized version of ref1 should be the same as ref2
      assert.strictEqual(ref1.toString(), ref2.toString());
      assert.deepEqual(ref1, ref2);
    }));
    it(`tests if expressions are rearranged 2`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ (num + 5) <= (2*num - 11) ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
      ref1.normalize();
      const manifestAst2 = parse(`
          particle Foo
              input: reads Something {num: Number [ num > 16 or num == 16]}
      `);
      const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
      // normalized version of ref1 should be the same as ref2
      assert.strictEqual(ref1.toString(), ref2.toString());
      assert.deepEqual(ref1, ref2);
    }));
    it(`tests if expressions are rearranged 3`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ (num - 5)/(num - 2) <= 0 ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
      ref1.normalize();
      const manifestAst2 = parse(`
          particle Foo
              input: reads Something {num: Number [ ((num > 5 and num < 2) or (num < 5 and num > 2)) or (num == 5 and num != 2) ]}
      `);
      const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
      ref2.normalize();
      // normalized version of ref1 should be the same as ref2
      assert.strictEqual(ref1.toString(), ref2.toString());
    }));
    it(`tests if expressions are rearranged 4`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ (num+2)*(num+1)+3 > 6 ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
      ref1.normalize();
      const manifestAst2 = parse(`
          particle Foo
              input: reads Something {num: Number [ num*3 + num*num > 1 ]}
      `);
      const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
      ref2.normalize();
      // normalized version of ref1 should be the same as ref2
      assert.strictEqual(ref1.toString(), ref2.toString());
    }));
    it(`tests if expressions are rearranged 5`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ num == 3 ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);

      Normalizer.rearrangeNumericalExpression(ref1.expression as BinaryExpression);
      assert.strictEqual(ref1.toString(), '[(num == 3)]');
    }));
    it(`tests if expressions are rearranged 4.0`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ 3 == num ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);

      Normalizer.rearrangeNumericalExpression(ref1.expression as BinaryExpression);
      assert.strictEqual(ref1.toString(), '[(num == 3)]');
    }));
    it(`tests if expressions are rearranged 4.1`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ 2 == (num-1) ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);

      Normalizer.rearrangeNumericalExpression(ref1.expression as BinaryExpression);
      assert.strictEqual(ref1.toString(), '[(num == 3)]');
    }));
    it(`tests if expressions are rearranged 4.2`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ (num+2) == (2*num-1) ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);

      Normalizer.rearrangeNumericalExpression(ref1.expression as BinaryExpression);
      assert.strictEqual(ref1.toString(), '[(num == 3)]');
    }));
    it(`tests if expressions are rearranged 4.3`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ ((num+2)/(2*num-1)) == 1 ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);

      Normalizer.rearrangeNumericalExpression(ref1.expression as BinaryExpression);
      assert.strictEqual(ref1.toString(), '[((num == 3) and (num != 0.5))]');
    }));
    it(`tests if expressions are rearranged 4.4`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ ((num+2)/(2*num-1))+3 == 4 ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);

      Normalizer.rearrangeNumericalExpression(ref1.expression as BinaryExpression);
      assert.strictEqual(ref1.toString(), '[((num == 3) and (num != 0.5))]');
    }));
    it(`tests if expressions are rearranged 4.5`, Flags.withFieldRefinementsAllowed(async () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ ((num+2)/(2*num-1))+3 == 4 ]}
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);

      ref1.normalize();
      const manifestAst2 = parse(`
          particle Foo
              input: reads Something {num: Number [ num == 3 and num != 0.5 ]}
      `);
      const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
      // normalized version of ref1 should be the same as ref2
      assert.strictEqual(ref1.toString(), ref2.toString());
    }));
    it(`tests if expressions are rearranged 5`, () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {a: Number, b: Number} [3*(a+b) > a+2*b]
      `);
      const typeData = {'a': 'Number', 'b': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.refinement, typeData);
      ref1.normalize();
      const manifestAst2 = parse(`
          particle Foo
              input: reads Something {a: Number, b: Number} [b + a*2 > 0]
      `);
      const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.refinement, typeData);
      ref2.normalize();
      // normalized version of ref1 should be the same as ref2
      assert.strictEqual(ref1.toString(), ref2.toString());
    });
    it(`tests if expressions are rearranged 6`, () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {a: Number, b: Number} [2*(a+b) > a+2*b]
      `);
      const typeData = {'a': 'Number', 'b': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.refinement, typeData);
      ref1.normalize();
      const manifestAst2 = parse(`
          particle Foo
              input: reads Something {a: Number, b: Number} [a > 0]
      `);
      const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.refinement, typeData);
      ref2.normalize();
      // normalized version of ref1 should be the same as ref2
      assert.strictEqual(ref1.toString(), ref2.toString());
    });

    const evaluatesToTrue = (expr: string, data: object = {}) => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: Number} [ ${expr} ]
        `);
        const typeData = {'num': 'Number'};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.refinement, typeData);
        // normalized version of ref1 should be the same as ref2
        assert.isTrue(ref1.validateData(data), `expected expression (${expr}) to evaluate to true`);
    };
    const triviallyTrue = (expr: string, type: string = 'Number') => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: ${type}} [ ${expr} ]
        `);
        const typeData = {'num': type};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.refinement, typeData);
        ref1.normalize();
        // normalized version of ref1 should be equivalent to 'true'.
        assert.strictEqual(ref1.toString(), '[true]', `expected expression (${expr}) to be trivially true`);
    };
    describe('Correctly handles date time units', () => {
      describe('for Number', () => {
        it('control (ensure that the test approach works)', () => {
          triviallyTrue('1 == 1');
          triviallyTrue('1 != 2');
        });
        it('uses millseconds by default', () => {
          triviallyTrue('1 == 1 milliseconds');
        });
        it('seconds to milliseconds', () => {
          triviallyTrue('1000 == 1 seconds');
          triviallyTrue('2000 == 2 seconds');
        });
        it('minutes to seconds', () => {
          triviallyTrue('1 minutes == 60 seconds');
          triviallyTrue('2 minutes == 120000 milliseconds');
        });
        it('hours to minutes', () => {
          triviallyTrue('1 hours == 60 minutes');
          triviallyTrue('2 hours == 7200 seconds');
        });
        it('days to hours', () => {
          triviallyTrue('1 days == 24 hours');
          triviallyTrue('2 days == 2880 minutes');
        });
        it('handles singular and plural forms', () => {
          triviallyTrue('2 * 1 day == 2 days');
          triviallyTrue('1 day == 24 hours');
          triviallyTrue('1 day != 24 hours + 1 second');
        });
        it('handles simple linear solving', () => {
          triviallyTrue('num + 1 milliseconds > num');
        });
      });
      describe('for BigInt', () => {
        it('control (ensure that the test approach works)', () => {
          triviallyTrue('1n == 1n');
          triviallyTrue('1n != 2n');
        });
        it('uses millseconds by default', () => {
          triviallyTrue('1n == 1n milliseconds');
        });
        it('seconds to milliseconds', () => {
          triviallyTrue('1000n == 1n seconds');
          triviallyTrue('2000n == 2n seconds');
        });
        it('minutes to seconds', () => {
          triviallyTrue('1n minutes == 60n seconds');
          triviallyTrue('2n minutes == 120000n milliseconds');
        });
        it('hours to minutes', () => {
          triviallyTrue('1n hours == 60n minutes');
          triviallyTrue('2n hours == 7200n seconds');
        });
        it('days to hours', () => {
          triviallyTrue('1n days == 24n hours');
          triviallyTrue('2n days == 2880n minutes');
        });
        it('handles singular and plural forms', () => {
          triviallyTrue('2n * 1n day == 2n days');
          triviallyTrue('1n day == 24n hours');
          triviallyTrue('1n day != 24n hours + 1n second');
        });
        it('handles simple linear solving', () => {
          triviallyTrue('num + 1n milliseconds > num', 'BigInt');
        });
        it.skip('handles simple polynomial solving', () => {
          triviallyTrue('num >= 0n or num <= 0n', 'BigInt');
          triviallyTrue('num >= 0n or num < 0n', 'BigInt');
          triviallyTrue('num > 0n or num <= 0n', 'BigInt');
        });
        it.skip('handles simple polynomial solving', () => {
          triviallyTrue('num * num >= 0n', 'BigInt');
        });
      });
    });
    describe('Correctly handles date time using now()', () => {
      it('now() is after time of writing', () => {
        // Checks that 'now' is after 04/22/2020 @ 7:19am (UTC).
        evaluatesToTrue('now() > 1587539956');
        evaluatesToTrue('not (now() < 1587539956)');
      });
    });
  });

  describe('NumberRange', () => {
      it('tests union operations on a range', () => {
          const range1 = new NumberRange();
          // range1 = [];
          range1.unionWithSeg(NumberSegment.closedClosed(0, 10));
          // range1 = [0, 10];
          assert.deepEqual(range1, new NumberRange([NumberSegment.closedClosed(0, 10)]));
          range1.unionWithSeg(NumberSegment.openClosed(20, 30));
          // range1 = [0, 10] U (20,30];
          assert.deepEqual(range1, new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.openClosed(20, 30)]));
          range1.unionWithSeg(NumberSegment.closedOpen(5, 15));
          // range1 = [0, 15) U (20,30];
          assert.deepEqual(range1, new NumberRange([NumberSegment.closedOpen(0, 15), NumberSegment.openClosed(20, 30)]));
          const range2 = new NumberRange([NumberSegment.closedClosed(-1, -1), NumberSegment.closedClosed(5, 7), NumberSegment.openClosed(15, 19)]);
          // range2 = [-1, -1] U [5, 7] U (15,19];
          range1.union(range2);
          // range1 = [-1, -1] U [0, 15) U (15, 19] U (20, 30]
          assert.deepEqual(range1, new NumberRange([NumberSegment.closedClosed(-1, -1), NumberSegment.closedOpen(0, 15), NumberSegment.openClosed(15, 19), NumberSegment.openClosed(20, 30)]));
      });
      it('tests intersection operations on a range 0', () => {
          const range1 = new NumberRange([NumberSegment.closedClosed(0, 10)]);
          // range1 = [0, 10];
          const range2 = range1.intersectWithSeg(NumberSegment.openOpen(5, 25));
          // range2 = (5, 10];
          assert.deepEqual(range2, new NumberRange([NumberSegment.openClosed(5, 10)]));
      });
      it('tests intersection operations on a range 1', () => {
          const range1 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
          // range1 = [0, 10] U [20,30];
          const range2 = range1.intersectWithSeg(NumberSegment.openOpen(5, 25));
          // range2 = (5, 10] U [20, 25);
          assert.deepEqual(range2, new NumberRange([NumberSegment.openClosed(5, 10), NumberSegment.closedOpen(20, 25)]));
      });
      it('tests intersection operations on a range 2', () => {
          const range1 = new NumberRange([NumberSegment.openClosed(5, 10), NumberSegment.closedClosed(20, 25)]);
          // range1 = (5, 10] U [20, 25);
          const range2 = range1.intersectWithSeg(NumberSegment.closedOpen(5, 15));
          // range2 = (5, 10];
          assert.deepEqual(range2, new NumberRange([NumberSegment.openClosed(5, 10)]));
      });
      it('tests intersection operations on a range 3', () => {
          const range1 = new NumberRange([NumberSegment.openClosed(5, 10)]);
          const range2 = new NumberRange([NumberSegment.closedClosed(-1, -1), NumberSegment.closedOpen(4, 10), NumberSegment.closedClosed(13, 19)]);
          // range2 = [-1, -1] U [4, 10) U [13,19];
          const range3 = range1.intersect(range2);
          // range3 = (5, 10);
          assert.deepEqual(range3, new NumberRange([NumberSegment.openOpen(5, 10)]));
      });
      it('tests if a range is a subset of another 0', () => {
          const range1 = NumberRange.universal(Primitive.NUMBER);
          // range1 = (-inf, +inf)
          const range2 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
          // range2 = [0, 10] U [20,30];
          assert.isTrue(range2.isSubsetOf(range1));
      });
      it('tests if a range is a subset of another 1', () => {
          const range1 = NumberRange.universal(Primitive.NUMBER);
          // range1 = (-inf, +inf)
          const range2 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
          // range2 = [0, 10] U [20,30];
          assert.isTrue(range2.isSubsetOf(range1));
      });
      it('tests if a range is a subset of another 2', () => {
          const range1 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
          const range2 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
          // range1 = [0, 10] U [20,30];
          assert.isTrue(range2.isSubsetOf(range1));
      });
      it('tests if a range is a subset of another 3', () => {
          const range1 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(22, 30)]);
          const range2 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
          // range1 = [0, 10] U [22,30];
          assert.isFalse(range2.isSubsetOf(range1));
      });
      it('tests if a range is a subset of another 4', () => {
          const range1 = new NumberRange();
          const range2 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
          // range1 = [];
          assert.isTrue(range1.isSubsetOf(range2));
      });
      it('tests if a range is a subset of another 5', () => {
          const range1 = new NumberRange([NumberSegment.closedOpen(0, 10), NumberSegment.closedClosed(20, 30)]);
          const range2 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
          // range1 = [0, 10) U [20,30];
          assert.isTrue(range1.isSubsetOf(range2));
      });
      it('tests the difference of ranges 1', () => {
          const range1 = NumberRange.universal(Primitive.NUMBER);
          // range1 = (-inf, +inf)
          const range2 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
          // range2 = [0, 10] U [20,30];
          const diff = NumberRange.difference(range1, range2);
          // diff = (-inf, 0) U (10,20) U (30, inf)
          assert.deepEqual(diff, new NumberRange([NumberSegment.closedOpen(Number.NEGATIVE_INFINITY, 0), NumberSegment.openOpen(10, 20), NumberSegment.openClosed(30, Number.POSITIVE_INFINITY)]));
      });
      it('tests the difference of ranges 2', () => {
          const range1 = new NumberRange([NumberSegment.closedOpen(0, 20), NumberSegment.openClosed(40, 50)]);
          // range1 = [0,20) U (40, 50]
          const range2 = new NumberRange([NumberSegment.openOpen(0, 5), NumberSegment.closedOpen(7, 12), NumberSegment.closedClosed(15, 43), NumberSegment.openClosed(45, 50)]);
          // range2 = (0,5) U [7,12) U [15, 43] U (45, 50]
          const diff = NumberRange.difference(range1, range2);
          // diff = [0, 0] U [5,7) U [12,15) U (43, 45]
          assert.deepEqual(diff, new NumberRange([NumberSegment.closedClosed(0, 0), NumberSegment.closedOpen(5, 7), NumberSegment.closedOpen(12, 15), NumberSegment.openClosed(43, 45)]));
      });
      it('tests the complement of number ranges', () => {
        const range = new NumberRange([NumberSegment.closedClosed(0, 10)], Primitive.NUMBER);
        // range =  [0,10]
        const complement = range.complement();
        // complement = (-inf, 0) U (10, inf)
        assert.deepEqual(complement, new NumberRange([NumberSegment.closedOpen(Number.NEGATIVE_INFINITY, 0), NumberSegment.openClosed(10, Number.POSITIVE_INFINITY)], Primitive.NUMBER));
      });
      it('tests the complement of boolean ranges', () => {
        const range = NumberRange.unit(0, Primitive.BOOLEAN);
        // range = [0,0]
        const complement = range.complement();
        // complement = [1,1]
        assert.deepEqual(complement, NumberRange.unit(1, Primitive.BOOLEAN));
      });
  });

  describe('NumberFractions', () => {
    it('tests fraction addition works', () => {
      const a = new NumberTerm({'a': 1});         // a
      const a2 = new NumberTerm({'a': 2});        // a^2
      const cnst = new NumberTerm({});
      let num1 = new NumberMultinomial({
          [a2.toKey()]: 1,                  // a^2
          [a.toKey()]: 1,                   // a
          [cnst.toKey()]: 9                 // 9
      }); // a^2 + a + 9
      const den1 = new NumberMultinomial({
        [a.toKey()]: 2,                     // 2a
      }); // 2a
      let frac1 = new NumberFraction(num1, den1); // (a^2+a+9)/2a
      let num2 = new NumberMultinomial({
        [a.toKey()]: 1,                     // a
        [cnst.toKey()]: 5                   // 5
      }); // a+5
      let den2 = new NumberMultinomial({
        [cnst.toKey()]: 3                   // 3
      }); // 3
      let frac2 = new NumberFraction(num2, den2); // (a+5)/3
      let sum = NumberFraction.add(frac1, frac2); // (5a^2+13a+27)/6a
      assert.deepEqual(sum.num.terms, {
        [a2.toKey()]: 5,                    // a^2
        [a.toKey()]: 13,                    // a
        [cnst.toKey()]: 27                  // 9
      });
      assert.deepEqual(sum.den.terms, {
        [a.toKey()]: 6                      // a
      });
      num1 = new NumberMultinomial({
        [a.toKey()]: 1,                     // a
      }); // a
      frac1 = new NumberFraction(num1);           // a/1
      num2 = new NumberMultinomial({
        [cnst.toKey()]: 5                   // 5
      }); // 5
      den2 = new NumberMultinomial({
        [cnst.toKey()]: 9                   // 9
      }); // 9
      frac2 = new NumberFraction(num2, den2);     // 5/9
      sum = NumberFraction.add(frac1, frac2);     // (9a+5)/9
      assert.deepEqual(sum.num.terms, {
        [a.toKey()]: 9,                     // 9a
        [cnst.toKey()]: 5                   // 5
      });
      assert.deepEqual(sum.den.terms, {
        [cnst.toKey()]: 9                   // 9
      });
    });
    it('tests fraction subtraction works', () => {
      const a = new NumberTerm({'a': 1});                 // a
      const a2 = new NumberTerm({'a': 2});                // a^2
      const cnst = new NumberTerm({});
      const num1 = new NumberMultinomial({
          [a2.toKey()]: 1,                          // a^2
          [a.toKey()]: 1,                           // a
          [cnst.toKey()]: 9                         // 9
      }); // a^2 + a + 9
      const den1 = new NumberMultinomial({
        [a.toKey()]: 2,                             // 2a
      }); // 2a
      const frac1 = new NumberFraction(num1, den1);       // (a^2+a+9)/2a
      const num2 = new NumberMultinomial({
        [a.toKey()]: 1,                             // a
        [cnst.toKey()]: 5                           // 5
      }); // a+5
      const den2 = new NumberMultinomial({
        [cnst.toKey()]: 3                           // 3
      }); // 3
      const frac2 = new NumberFraction(num2, den2);       // (a+5)/3
      const sum = NumberFraction.subtract(frac1, frac2);  // (a^2-7a+27)/6a
      assert.deepEqual(sum.num.terms, {
        [a2.toKey()]: 1,                            // a^2
        [a.toKey()]: -7,                            // -7a
        [cnst.toKey()]: 27                          // 27
      });
      assert.deepEqual(sum.den.terms, {
        [a.toKey()]: 6,                             // 6a
      });
    });
    it('tests fraction negation works', () => {
      const a = new NumberTerm({'a': 1});                 // a
      const a2 = new NumberTerm({'a': 2});                // a^2
      const cnst = new NumberTerm({});
      const num1 = new NumberMultinomial({
          [a2.toKey()]: 1,                          // a^2
          [a.toKey()]: 1,                           // a
          [cnst.toKey()]: 9                         // 9
      }); // a^2 + a + 9
      const den1 = new NumberMultinomial({
        [a.toKey()]: 2,                             // 2a
      }); // 2a
      const frac1 = new NumberFraction(num1, den1);       // (a^2+a+9)/2a
      const neg = NumberFraction.negate(frac1);           // (-a^2-a+-9)/2a
      assert.deepEqual(neg.num.terms, {
          [a2.toKey()]: -1,                         // a^2
          [a.toKey()]: -1,                          // a
          [cnst.toKey()]: -9                        // 9
      });
      assert.deepEqual(neg.den.terms, {
        [a.toKey()]: 2,  // 2a
      });
    });
    it('tests fraction multiplication works', () => {
      const a = new NumberTerm({'a': 1});                 // a
      const a2 = new NumberTerm({'a': 2});                // a^2
      const cnst = new NumberTerm({});
      let num1 = new NumberMultinomial({
          [a.toKey()]: 1,                           // a
          [cnst.toKey()]: 9                         // 9
      }); // a + 9
      const den1 = new NumberMultinomial({
        [a.toKey()]: 2,                             // 2a
      }); // 2a
      let frac1 = new NumberFraction(num1, den1);         // (a+9)/2a
      const num2 = new NumberMultinomial({
        [a.toKey()]: 1,                             // a
        [cnst.toKey()]: 5                           // 5
      }); // a + 5
      const den2 = new NumberMultinomial({
        [cnst.toKey()]: 3                           // 9
      }); // a + 9
      let frac2 = new NumberFraction(num2, den2);         // (a+5)/3
      let sum = NumberFraction.multiply(frac1, frac2);    // (a^2+14a+45)/6a
      assert.deepEqual(sum.num.terms, {
        [a2.toKey()]: 1,                            // a^2
        [a.toKey()]: 14,                            // 14a
        [cnst.toKey()]: 45                          // 45
      }); // a^2 + 14a + 45
      assert.deepEqual(sum.den.terms, {
        [a.toKey()]: 6,                             // 14a
      });
      num1 = new NumberMultinomial({
        [a2.toKey()]: 1,                            // a^2
        [a.toKey()]: 1,                             // a
      });
      frac1 = new NumberFraction(num1);                   // (a^2+a)/1
      frac2 = new NumberFraction();                       // 0 / 1
      sum = NumberFraction.multiply(frac1, frac2);        // 0/1
      assert.deepEqual(sum.num.terms, {});
      assert.deepEqual(sum.den.terms, {
        [cnst.toKey()]: 1                           // 1
      });
    });
    it('tests fraction division works', () => {
      const a = new NumberTerm({'a': 1});                 // a
      const a2 = new NumberTerm({'a': 2});                // a^2
      const cnst = new NumberTerm({});
      const num1 = new NumberMultinomial({
          [a.toKey()]: 1,                           // a
          [cnst.toKey()]: 9                         // 9
      }); // a + 9
      const den1 = new NumberMultinomial({
        [a.toKey()]: 2,                             // 2a
      }); // 2a
      const frac1 = new NumberFraction(num1, den1);       // (a+9)/2a
      const num2 = new NumberMultinomial({
        [a.toKey()]: 1,                             // a
        [cnst.toKey()]: 5                           // 5
      }); // a + 5
      const den2 = new NumberMultinomial({
        [cnst.toKey()]: 3                           // 9
      }); // a + 9
      const frac2 = new NumberFraction(num2, den2);       // (a+5)/3
      const sum = NumberFraction.divide(frac1, frac2);    // (3a+27)/(2a^2+10a)
      assert.deepEqual(sum.num.terms, {
        [a.toKey()]: 3,                             // 3a
        [cnst.toKey()]: 27                          // 27
      });
      assert.deepEqual(sum.den.terms, {
        [a2.toKey()]: 2,                            // 2a^2
        [a.toKey()]: 10,                            // 10a
      });
    });
  });

  describe('Number Terms', () => {
    it('tests to and from key', () => {
      const term1 = new NumberTerm({'b': 1, 'a': 1});
      const term2 = new NumberTerm({'a': 1, 'b': 1});
      assert.strictEqual(term1.toKey(), term2.toKey());
      assert.deepEqual(NumberTerm.fromKey(term1.toKey()), NumberTerm.fromKey(term2.toKey()));
    });
  });

  describe('NumberMultinomials', () => {
    it('tests multinomial setters and getters work', () => {
      const aIb = new NumberTerm({'b': 1, 'a': 1});  // ab
      const aIb2 = new NumberTerm({'b': 2, 'a': 1}); // ab^2
      const cnst = new NumberTerm({});
      const num = new NumberMultinomial({
          [aIb.toKey()]: 2,   // 2ab
          [aIb2.toKey()]: 1,  // ab^2
          [cnst.toKey()]: 5   // 5
      }); // 2ab + ab^2 + 5
      assert.deepEqual(num.terms, {
          [aIb2.toKey()]: 1,  // ab^2
          [cnst.toKey()]: 5,  // 5
          [aIb.toKey()]: 2,   // 2ab
      });
    });
    it('tests multinomial addition works', () => {
      const aIb = new NumberTerm({'b': 1, 'a': 1}); // ab
      const aIb2 = new NumberTerm({'b': 2, 'a': 1}); // ab^2
      const cnst = new NumberTerm({});
      const num1 = new NumberMultinomial({
          [aIb2.toKey()]: 2,  // 2ab^2
          [cnst.toKey()]: 1   // 5
      }); // 2ab^2 + 1
      const num2 = new NumberMultinomial({
        [aIb.toKey()]: 2,   // 2ab
        [aIb2.toKey()]: 1,  // ab^2
        [cnst.toKey()]: 5   // 5
      }); // 2ab + ab^2 + 5
      const sum = NumberMultinomial.add(num1, num2);      // 2ab + 3ab^2 + 5
      assert.deepEqual(sum.terms, {
        [aIb.toKey()]: 2,   // 2ab
        [aIb2.toKey()]: 3,  // 3ab^2
        [cnst.toKey()]: 6   // 6
      });
    });
    it('tests multinomial negation works', () => {
      const aIb2 = new NumberTerm({'b': 2, 'a': 1}); // ab^2
      const cnst = new NumberTerm({});
      const num1 = new NumberMultinomial({
          [aIb2.toKey()]: 2,  // 2ab^2
          [cnst.toKey()]: 1   // 5
      }); // 2ab^2 + 1
      const sum = NumberMultinomial.negate(num1);      // -2ab^2 - 1
      assert.deepEqual(sum.terms, {
        [aIb2.toKey()]: -2,  // -2ab^2
        [cnst.toKey()]: -1   // -1
      });
    });
    it('tests multinomial subtraction works', () => {
      const aIb = new NumberTerm({'b': 1, 'a': 1}); // ab
      const aIb2 = new NumberTerm({'b': 2, 'a': 1}); // ab^2
      const cnst = new NumberTerm({});
      const num1 = new NumberMultinomial({
          [aIb2.toKey()]: 2,  // 2ab^2
          [cnst.toKey()]: 1   // 5
      }); // 2ab^2 + 1
      const num2 = new NumberMultinomial({
        [aIb.toKey()]: 2,   // 2ab
        [aIb2.toKey()]: 2,  // 2ab^2
        [cnst.toKey()]: 5   // 5
      }); // 2ab + ab^2 + 5
      const sum = NumberMultinomial.subtract(num1, num2);      // -2ab - 4
      assert.deepEqual(sum.terms, {
        [aIb.toKey()]: -2,   // 2ab
        [cnst.toKey()]: -4   // -4
      });
    });
    it('tests multinomial multiplication works', () => {
      const aIb = new NumberTerm({'b': 1, 'a': 1}); // ab
      const aIb2 = new NumberTerm({'b': 2, 'a': 1}); // ab^2
      const cnst = new NumberTerm({});
      const a2Ib3 = new NumberTerm({'a': 2, 'b': 3});
      const a2Ib4 = new NumberTerm({'a': 2, 'b': 4});
      const num1 = new NumberMultinomial({
          [aIb2.toKey()]: 2,  // 2ab^2
          [cnst.toKey()]: 1   // 1
      }); // 2ab^2 + 1
      const num2 = new NumberMultinomial({
        [aIb.toKey()]: 2,   // 2ab
        [aIb2.toKey()]: 1,  // ab^2
        [cnst.toKey()]: 5   // 5
      }); // 2ab + ab^2 + 5
      const sum = NumberMultinomial.multiply(num1, num2);      // 4a^2b^3 + 2a^2b^4 + 11ab^2 + 2ab + 5
      assert.deepEqual(sum.terms, {
        [aIb.toKey()]: 2,     // 2ab
        [aIb2.toKey()]: 11,   // 11ab^2
        [cnst.toKey()]: 5,    // 5
        [a2Ib3.toKey()]: 4,   // 4a^2b^3
        [a2Ib4.toKey()]: 2,   // 2a^2b^4
      });
    });
  });

  describe('BigIntRange', () => {
      it('BigIntRange construction functions forms an identity with a single segment', () => {
          const range = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10))]);
          assert.deepEqual(range.segmentsForTesting(), [
            {
              from: {isOpen: false, val: BigInt(0)},
              to: {isOpen: false, val: BigInt(10)},
            }
          ]);
      });
      it('BigIntRange uses unionWithSeg without removing important segments', () => {
          const range = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.openClosed(BigInt(20), BigInt(30))]);
          assert.deepEqual(range.segmentsForTesting(), [
            {
              from: {isOpen: false, val: BigInt(0)},
              to: {isOpen: false, val: BigInt(10)},
            },
            {
              from: {isOpen: true, val: BigInt(20)},
              to: {isOpen: false, val: BigInt(30)},
            }
          ]);
      });
      it('BigIntRange uses unionWithSeg merges overlapping segments', () => {
          const range = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(25)), BigIntSegment.openClosed(BigInt(20), BigInt(30))]);
          assert.deepEqual(range.segmentsForTesting(), [
            {
              from: {isOpen: false, val: BigInt(0)},
              to: {isOpen: false, val: BigInt(30)}
            }
          ]);
      });
      it('tests union operations on a range', () => {
          const range1 = new BigIntRange();
          // range1 = [];
          range1.unionWithSeg(BigIntSegment.closedClosed(BigInt(0), BigInt(10)));
          // range1 = [0, 10];
          assert.deepEqual(range1, new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10))]));
          range1.unionWithSeg(BigIntSegment.openClosed(BigInt(20), BigInt(30)));
          // range1 = [0, 10] U (20,30];
          assert.deepEqual(range1, new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.openClosed(BigInt(20), BigInt(30))]));
          range1.unionWithSeg(BigIntSegment.closedOpen(BigInt(5), BigInt(15)));
          // range1 = [0, 15) U (20,30];
          assert.deepEqual(range1, new BigIntRange([BigIntSegment.closedOpen(BigInt(0), BigInt(15)), BigIntSegment.openClosed(BigInt(20), BigInt(30))]));
          const range2 = new BigIntRange([BigIntSegment.closedClosed(-BigInt(1), -BigInt(1)), BigIntSegment.closedClosed(BigInt(5), BigInt(7)), BigIntSegment.openClosed(BigInt(15), BigInt(19))]);
          // range2 = [-1, -1] U [5, 7] U (15,19];
          range1.union(range2);
          // range1 = [-1, -1] U [0, 15) U (15, 19] U (20, 30]
          assert.deepEqual(range1, new BigIntRange([BigIntSegment.closedClosed(-BigInt(1), -BigInt(1)), BigIntSegment.closedOpen(BigInt(0), BigInt(15)), BigIntSegment.openClosed(BigInt(15), BigInt(19)), BigIntSegment.openClosed(BigInt(20), BigInt(30))]));
      });
      it('tests intersection operations on a range 1', () => {
          const range1 = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(20), BigInt(30))]);
          // range1 = [0, 10] U [20,30];
          const range2 = range1.intersectWithSeg(BigIntSegment.openOpen(BigInt(5), BigInt(25)));
          // range2 = (5, 10] U [20, 25);
          assert.deepEqual(range2, new BigIntRange([BigIntSegment.openClosed(BigInt(5), BigInt(10)), BigIntSegment.closedOpen(BigInt(20), BigInt(25))]));
      });
      it('tests intersection operations on a range 2', () => {
          const range1 = new BigIntRange([BigIntSegment.openClosed(BigInt(5), BigInt(10)), BigIntSegment.closedOpen(BigInt(20), BigInt(25))]);
          const range2 = range1.intersectWithSeg(BigIntSegment.closedOpen(BigInt(5), BigInt(15)));
          // range2 = (5, 10];
          assert.deepEqual(range2, new BigIntRange([BigIntSegment.openClosed(BigInt(5), BigInt(10))]));
      });
      it('tests intersection operations on a range 3', () => {
          const range1 = new BigIntRange([BigIntSegment.openClosed(BigInt(5), BigInt(10))]);
          const range2 = new BigIntRange([BigIntSegment.closedClosed(-BigInt(1), -BigInt(1)), BigIntSegment.closedOpen(BigInt(4), BigInt(10)), BigIntSegment.closedClosed(BigInt(13), BigInt(19))]);
          // range2 = [-1, -1] U [4, 10) U [13,19];
          const range3 = range1.intersect(range2);
          // range3 = (5, 10);
          assert.deepEqual(range3, new BigIntRange([BigIntSegment.openOpen(BigInt(5), BigInt(10))]));
      });
      it('tests if a range is a subset of another 1', () => {
          const range1 = BigIntRange.universal(Primitive.BIGINT);
          // range1 = (-inf, +inf)
          const range2 = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(20), BigInt(30))]);
          // range2 = [0, 10] U [20,30];
          assert.isTrue(range2.isSubsetOf(range1));
      });
      it('tests if a range is a subset of another 2', () => {
          const range1 = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(20), BigInt(30))]);
          const range2 = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(20), BigInt(30))]);
          // range1 = [0, 10] U [20,30];
          assert.isTrue(range2.isSubsetOf(range1));
      });
      it('tests if a range is a subset of another 3', () => {
          const range1 = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(22), BigInt(30))]);
          const range2 = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(20), BigInt(30))]);
          // range1 = [0, 10] U [22,30];
          assert.isFalse(range2.isSubsetOf(range1));
      });
      it('tests if a range is a subset of another 4', () => {
          const range1 = new BigIntRange();
          const range2 = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(20), BigInt(30))]);
          // range1 = [];
          assert.isTrue(range1.isSubsetOf(range2));
      });
      it('tests if a range is a subset of another 5', () => {
          const range1 = new BigIntRange([BigIntSegment.closedOpen(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(20), BigInt(30))]);
          const range2 = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(20), BigInt(30))]);
          // range1 = [0, 10) U [20,30];
          assert.isTrue(range1.isSubsetOf(range2));
      });
      it('tests the difference of ranges 1', () => {
          const range1 = BigIntRange.universal(Primitive.BIGINT);
          // range1 = (-inf, +inf)
          const range2 = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10)), BigIntSegment.closedClosed(BigInt(20), BigInt(30))]);
          // range2 = [0, 10] U [20,30];
          const diff = BigIntRange.difference(range1, range2);
          // diff = (-inf, 0) U (10,20) U (30, inf)
          assert.deepEqual(diff, new BigIntRange([BigIntSegment.closedOpen('NEGATIVE_INFINITY', BigInt(0)), BigIntSegment.openOpen(BigInt(10), BigInt(20)), BigIntSegment.openClosed(BigInt(30), 'POSITIVE_INFINITY')]));
      });
      it('tests the difference of ranges 2', () => {
          const range1 = new BigIntRange([BigIntSegment.closedOpen(BigInt(0), BigInt(20)), BigIntSegment.openClosed(BigInt(40), BigInt(50))]);
          // range1 = [0,20) U (40, 50]
          const range2 = new BigIntRange([BigIntSegment.openOpen(BigInt(0), BigInt(5)), BigIntSegment.closedOpen(BigInt(7), BigInt(12)), BigIntSegment.closedClosed(BigInt(15), BigInt(43)), BigIntSegment.openClosed(BigInt(45), BigInt(50))]);
          // range2 = (0,5) U [7,12) U [15, 43] U (45, 50]
          const diff = BigIntRange.difference(range1, range2);
          // diff = [0, 0] U [5,7) U [12,15) U (43, 45]
          assert.deepEqual(diff, new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(0)), BigIntSegment.closedOpen(BigInt(5), BigInt(7)), BigIntSegment.closedOpen(BigInt(12), BigInt(15)), BigIntSegment.openClosed(BigInt(43), BigInt(45))]));
      });
      it('tests the complement of ranges 1', () => {
        const range = new BigIntRange([BigIntSegment.closedClosed(BigInt(0), BigInt(10))]);
        // range =  [0,10]
        const complement = range.complement();
        // complement = (-inf, 0) U (10, inf)
        assert.deepEqual(complement, new BigIntRange([BigIntSegment.closedOpen('NEGATIVE_INFINITY', BigInt(0)), BigIntSegment.openClosed(BigInt(10), 'POSITIVE_INFINITY')]));
      });
      it('tests the complement of ranges 2', () => {
        const range = BigIntRange.unit(BigInt(0), Primitive.BOOLEAN);
        // range = [0,0]
        const complement = range.complement();
        // complement = [1,1]
        assert.deepEqual(complement, BigIntRange.unit(BigInt(1), Primitive.BOOLEAN));
      });
  });

  describe('BigIntFractions', () => {
    const cnst = new BigIntTerm({});
    const a = new BigIntTerm({'a': BigInt(1)});         // a
    const a2 = new BigIntTerm({'a': BigInt(2)});        // a^2
    it('tests fraction addition works 1', () => {
      const num1 = new BigIntMultinomial({
          [a2.toKey()]: BigInt(1),                  // a^2
          [a.toKey()]: BigInt(1),                   // a
          [cnst.toKey()]: BigInt(9)                 // 9
      }); // a^2 + a + 9
      const den1 = new BigIntMultinomial({
        [a.toKey()]: BigInt(2),                     // 2a
      }); // 2a
      const frac1 = new BigIntFraction(num1, den1); // (a^2+a+9)/2a
      const num2 = new BigIntMultinomial({
        [a.toKey()]: BigInt(1),                     // a
        [cnst.toKey()]: BigInt(5)                   // 5
      }); // a+5
      const den2 = new BigIntMultinomial({
        [cnst.toKey()]: BigInt(3)                   // 3
      }); // 3
      const frac2 = new BigIntFraction(num2, den2); // (a+5)/3
      const sum = BigIntFraction.add(frac1, frac2); // (5a^2+13a+27)/6a
      assert.deepEqual(sum.num.terms, {
        [a2.toKey()]: BigInt(5),                    // 5a^2
        [a.toKey()]: BigInt(13),                    // 13a
        [cnst.toKey()]: BigInt(27)                  // 27
      });
      assert.deepEqual(sum.den.terms, {
        [a.toKey()]: BigInt(6)                      // 6a
      });
    });
    it('tests fraction addition works 2', () => {
      const num1 = new BigIntMultinomial({
        [a.toKey()]: BigInt(1),                     // a
      }); // a
      const frac1 = new BigIntFraction(num1);           // a/1
      const num2 = new BigIntMultinomial({
        [cnst.toKey()]: BigInt(5)                   // 5
      }); // 5
      const den2 = new BigIntMultinomial({
        [cnst.toKey()]: BigInt(9)                   // 9
      }); // 9
      const frac2 = new BigIntFraction(num2, den2);     // 5/9
      const sum = BigIntFraction.add(frac1, frac2);     // (9a+5)/9
      assert.deepEqual(sum.num.terms, {
        [a.toKey()]: BigInt(9),                     // 9a
        [cnst.toKey()]: BigInt(5)                   // 5
      });
      assert.deepEqual(sum.den.terms, {
        [cnst.toKey()]: BigInt(9)                   // 9
      });
    });
    it('tests fraction subtraction works', () => {
      const num1 = new BigIntMultinomial({
          [a2.toKey()]: BigInt(1),                          // a^2
          [a.toKey()]: BigInt(1),                           // a
          [cnst.toKey()]: BigInt(9)                         // 9
      }); // a^2 + a + 9
      const den1 = new BigIntMultinomial({
        [a.toKey()]: BigInt(2),                             // 2a
      }); // 2a
      const frac1 = new BigIntFraction(num1, den1);       // (a^2+a+9)/2a
      const num2 = new BigIntMultinomial({
        [a.toKey()]: BigInt(1),                             // a
        [cnst.toKey()]: BigInt(5)                           // 5
      }); // a+5
      const den2 = new BigIntMultinomial({
        [cnst.toKey()]: BigInt(3)                           // 3
      }); // 3
      const frac2 = new BigIntFraction(num2, den2);       // (a+5)/3
      const sum = BigIntFraction.subtract(frac1, frac2);  // (a^2-7a+27)/6a
      assert.deepEqual(sum.num.terms, {
        [a2.toKey()]: BigInt(1),                            // a^2
        [a.toKey()]: -BigInt(7),                            // -7a
        [cnst.toKey()]: BigInt(27)                          // 27
      });
      assert.deepEqual(sum.den.terms, {
        [a.toKey()]: BigInt(6),                             // 6a
      });
    });
    it('tests fraction negation works', () => {
      const num1 = new BigIntMultinomial({
          [a2.toKey()]: BigInt(1),                          // a^2
          [a.toKey()]: BigInt(1),                           // a
          [cnst.toKey()]: BigInt(9)                         // 9
      }); // a^2 + a + 9
      const den1 = new BigIntMultinomial({
        [a.toKey()]: BigInt(2),                             // 2a
      }); // 2a
      const frac1 = new BigIntFraction(num1, den1);       // (a^2+a+9)/2a
      const neg = BigIntFraction.negate(frac1);           // (-a^2-a+-9)/2a
      assert.deepEqual(neg.num.terms, {
          [a2.toKey()]: -BigInt(1),                         // a^2
          [a.toKey()]: -BigInt(1),                          // a
          [cnst.toKey()]: -BigInt(9)                        // 9
      });
      assert.deepEqual(neg.den.terms, {
        [a.toKey()]: BigInt(2),  // 2a
      });
    });
    it('tests fraction multiplication works', () => {
      let num1 = new BigIntMultinomial({
          [a.toKey()]: BigInt(1),                           // a
          [cnst.toKey()]: BigInt(9)                         // 9
      }); // a + 9
      const den1 = new BigIntMultinomial({
        [a.toKey()]: BigInt(2),                             // 2a
      }); // 2a
      let frac1 = new BigIntFraction(num1, den1);         // (a+9)/2a
      const num2 = new BigIntMultinomial({
        [a.toKey()]: BigInt(1),                             // a
        [cnst.toKey()]: BigInt(5)                           // 5
      }); // a + 5
      const den2 = new BigIntMultinomial({
        [cnst.toKey()]: BigInt(3)                           // 9
      }); // a + 9
      let frac2 = new BigIntFraction(num2, den2);         // (a+5)/3
      let sum = BigIntFraction.multiply(frac1, frac2);    // (a^2+14a+45)/6a
      assert.deepEqual(sum.num.terms, {
        [a2.toKey()]: BigInt(1),                            // a^2
        [a.toKey()]: BigInt(14),                            // 14a
        [cnst.toKey()]: BigInt(45)                          // 45
      }); // a^2 + 14a + 45
      assert.deepEqual(sum.den.terms, {
        [a.toKey()]: BigInt(6),                             // 14a
      });
      num1 = new BigIntMultinomial({
        [a2.toKey()]: BigInt(1),                            // a^2
        [a.toKey()]: BigInt(1),                             // a
      });
      frac1 = new BigIntFraction(num1);                   // (a^2+a)/1
      frac2 = new BigIntFraction();                       // 0 / 1
      sum = BigIntFraction.multiply(frac1, frac2);        // 0/1
      assert.deepEqual(sum.num.terms, {});
      assert.deepEqual(sum.den.terms, {
        [cnst.toKey()]: BigInt(1)                           // 1
      });
    });
    it('tests fraction division works', () => {
      const num1 = new BigIntMultinomial({
          [a.toKey()]: BigInt(1),                           // a
          [cnst.toKey()]: BigInt(9)                         // 9
      }); // a + 9
      const den1 = new BigIntMultinomial({
        [a.toKey()]: BigInt(2),                             // 2a
      }); // 2a
      const frac1 = new BigIntFraction(num1, den1);       // (a+9)/2a
      const num2 = new BigIntMultinomial({
        [a.toKey()]: BigInt(1),                             // a
        [cnst.toKey()]: BigInt(5)                           // 5
      }); // a + 5
      const den2 = new BigIntMultinomial({
        [cnst.toKey()]: BigInt(3)                           // 9
      }); // a + 9
      const frac2 = new BigIntFraction(num2, den2);       // (a+5)/3
      const sum = BigIntFraction.divide(frac1, frac2);    // (3a+27)/(2a^2+10a)
      assert.deepEqual(sum.num.terms, {
        [a.toKey()]: BigInt(3),                             // 3a
        [cnst.toKey()]: BigInt(27)                          // 27
      });
      assert.deepEqual(sum.den.terms, {
        [a2.toKey()]: BigInt(2),                            // 2a^2
        [a.toKey()]: BigInt(10),                            // 10a
      });
    });
  });

  describe('Terms', () => {
    it('tests to and from key', () => {
      const term1 = new BigIntTerm({'b': BigInt(1), 'a': BigInt(1)});
      const term2 = new BigIntTerm({'a': BigInt(1), 'b': BigInt(1)});
      assert.strictEqual(term1.toKey(), term2.toKey());
      assert.deepEqual(BigIntTerm.fromKey(term1.toKey()), BigIntTerm.fromKey(term2.toKey()));
    });
  });

  describe('BigIntMultinomials', () => {
    it('tests multinomial setters and getters work', () => {
      const aIb = new BigIntTerm({'b': BigInt(1), 'a': BigInt(1)});  // ab
      const aIb2 = new BigIntTerm({'b': BigInt(2), 'a': BigInt(1)}); // ab^2
      const cnst = new BigIntTerm({});
      const num = new BigIntMultinomial({
          [aIb.toKey()]: BigInt(2),   // 2ab
          [aIb2.toKey()]: BigInt(1),  // ab^2
          [cnst.toKey()]: BigInt(5)   // 5
      }); // 2ab + ab^2 + 5
      assert.deepEqual(num.terms, {
          [aIb2.toKey()]: BigInt(1),  // ab^2
          [cnst.toKey()]: BigInt(5),  // 5
          [aIb.toKey()]: BigInt(2),   // 2ab
      });
    });
    it('tests multinomial addition works', () => {
      const aIb = new BigIntTerm({'b': BigInt(1), 'a': BigInt(1)}); // ab
      const aIb2 = new BigIntTerm({'b': BigInt(2), 'a': BigInt(1)}); // ab^2
      const cnst = new BigIntTerm({});
      const num1 = new BigIntMultinomial({
          [aIb2.toKey()]: BigInt(2),  // 2ab^2
          [cnst.toKey()]: BigInt(1)   // 5
      }); // 2ab^2 + 1
      const num2 = new BigIntMultinomial({
        [aIb.toKey()]: BigInt(2),   // 2ab
        [aIb2.toKey()]: BigInt(1),  // ab^2
        [cnst.toKey()]: BigInt(5)   // 5
      }); // 2ab + ab^2 + 5
      const sum = BigIntMultinomial.add(num1, num2);      // 2ab + 3ab^2 + 5
      assert.deepEqual(sum.terms, {
        [aIb.toKey()]: BigInt(2),   // 2ab
        [aIb2.toKey()]: BigInt(3),  // 3ab^2
        [cnst.toKey()]: BigInt(6)   // 6
      });
    });
    it('tests multinomial negation works', () => {
      const aIb2 = new BigIntTerm({'b': BigInt(2), 'a': BigInt(1)}); // ab^2
      const cnst = new BigIntTerm({});
      const num1 = new BigIntMultinomial({
          [aIb2.toKey()]: BigInt(2),  // 2ab^2
          [cnst.toKey()]: BigInt(1)   // 5
      }); // 2ab^2 + 1
      const sum = BigIntMultinomial.negate(num1);      // -2ab^2 - 1
      assert.deepEqual(sum.terms, {
        [aIb2.toKey()]: -BigInt(2),  // -2ab^2
        [cnst.toKey()]: -BigInt(1)   // -1
      });
    });
    it('tests multinomial subtraction works', () => {
      const aIb = new BigIntTerm({'b': BigInt(1), 'a': BigInt(1)}); // ab
      const aIb2 = new BigIntTerm({'b': BigInt(2), 'a': BigInt(1)}); // ab^2
      const cnst = new BigIntTerm({});
      const num1 = new BigIntMultinomial({
          [aIb2.toKey()]: BigInt(2),  // 2ab^2
          [cnst.toKey()]: BigInt(1)   // 5
      }); // 2ab^2 + 1
      const num2 = new BigIntMultinomial({
        [aIb.toKey()]: BigInt(2),   // 2ab
        [aIb2.toKey()]: BigInt(2),  // 2ab^2
        [cnst.toKey()]: BigInt(5)   // 5
      }); // 2ab + ab^2 + 5
      const sum = BigIntMultinomial.subtract(num1, num2);      // -2ab - 4
      assert.deepEqual(sum.terms, {
        [aIb.toKey()]: -BigInt(2),   // 2ab
        [cnst.toKey()]: -BigInt(4)   // -4
      });
    });
    it('tests multinomial multiplication works', () => {
      const aIb = new BigIntTerm({'b': BigInt(1), 'a': BigInt(1)}); // ab
      const aIb2 = new BigIntTerm({'b': BigInt(2), 'a': BigInt(1)}); // ab^2
      const cnst = new BigIntTerm({});
      const a2Ib3 = new BigIntTerm({'a': BigInt(2), 'b': BigInt(3)});
      const a2Ib4 = new BigIntTerm({'a': BigInt(2), 'b': BigInt(4)});
      const num1 = new BigIntMultinomial({
          [aIb2.toKey()]: BigInt(2),  // 2ab^2
          [cnst.toKey()]: BigInt(1)   // 1
      }); // 2ab^2 + 1
      const num2 = new BigIntMultinomial({
        [aIb.toKey()]: BigInt(2),   // 2ab
        [aIb2.toKey()]: BigInt(1),  // ab^2
        [cnst.toKey()]: BigInt(5)   // 5
      }); // 2ab + ab^2 + 5
      const sum = BigIntMultinomial.multiply(num1, num2);      // 4a^2b^3 + 2a^2b^4 + 11ab^2 + 2ab + 5
      assert.deepEqual(sum.terms, {
        [aIb.toKey()]: BigInt(2),     // 2ab
        [aIb2.toKey()]: BigInt(11),   // 11ab^2
        [cnst.toKey()]: BigInt(5),    // 5
        [a2Ib3.toKey()]: BigInt(4),   // 4a^2b^3
        [a2Ib4.toKey()]: BigInt(2),   // 2a^2b^4
      });
    });
  });
});
