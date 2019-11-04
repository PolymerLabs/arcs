/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../../runtime/manifest.js';
import {Dictionary} from '../../runtime/hot.js';
import {SchemaGraph} from '../schema2graph.js';

interface NodeInfo {
  name: string;     // generated class name
  parents: string;  // list of parent class names, sorted and stringified
  extras: string;   // fields this schema has in addition to its ancestors, sorted and stringified
  shares: boolean;  // indicates this schema shares a parent class with another schema
}

function convert(graph: SchemaGraph) {
  const nodes: NodeInfo[] = [];
  const aliases: Dictionary<string[]> = {};
  for (const node of graph.walk()) {
    nodes.push({
      name: node.name,
      parents: node.parents.map(p => p.name).sort().join(', '),
      extras: [...node.extras].sort().join(''),
      shares: node.sharesParent,
    });
    if (node.aliases.length) {
      aliases[node.name] = [...node.aliases].sort();
    }
  }
  return {nodes, aliases};
}

describe('schema2graph', () => {
  it('empty graph', async () => {
    const manifest = await Manifest.parse(`
      particle E
        consume root
          provide tile
    `);
    const graph = new SchemaGraph(manifest.particles[0]);
    assert.isEmpty([...graph.walk()]);
  });

  it('linear graph', async () => {
    const manifest = await Manifest.parse(`
      particle L
        h1: reads * {a: Text}                     // 1 -> 2 -> 3
        h2: reads * {a: Text, b: Text}
        h3: reads * {a: Text, b: Text, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'L_H1', parents: '',     extras: 'a', shares: false},
      {name: 'L_H2', parents: 'L_H1', extras: 'b', shares: false},
      {name: 'L_H3', parents: 'L_H2', extras: 'c', shares: false},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('diamond graph', async () => {
    const manifest = await Manifest.parse(`
      particle D
        h1: reads * {a: Text}                      //   1
        h2: reads * {a: Text, b: Text}              //  2 3
        h3: reads * {a: Text, c: Text}              //   4
        h4: reads * {a: Text, b: Text, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'D_H1', parents: '',           extras: 'a', shares: false},
      {name: 'D_H2', parents: 'D_H1',       extras: 'b', shares: true},
      {name: 'D_H3', parents: 'D_H1',       extras: 'c', shares: true},
      {name: 'D_H4', parents: 'D_H2, D_H3', extras: '',  shares: false},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('aliased schemas', async () => {
    const manifest = await Manifest.parse(`
      particle A
        h1: reads * {a: Text}                       //   1
        h2: reads * {a: Text, b: Text}              //  2 3
        h3: reads * {a: Text, c: Text}              //   4
        h4: reads * {a: Text, b: Text, c: Text}
        d2: reads * {a: Text, b: Text}
        d4: reads * {a: Text, b: Text, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'A_H1',       parents: '',                 extras: 'a', shares: false},
      {name: 'AInternal1', parents: 'A_H1',             extras: 'b', shares: true},
      {name: 'A_H3',       parents: 'A_H1',             extras: 'c', shares: true},
      {name: 'AInternal2', parents: 'AInternal1, A_H3', extras: '',  shares: false},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'AInternal1': ['A_D2', 'A_H2'],
      'AInternal2': ['A_D4', 'A_H4'],
    });
  });

  it('pyramid and vee as separate graphs', async () => {
    const manifest = await Manifest.parse(`
      particle S
        p0: reads * {a: Text}                      //    0
        p1: reads * {a: Text, b: Text}              //   1 2
        p2: reads * {a: Text, c: Text}              //  3   4
        p3: reads * {a: Text, b: Text, d: Text}
        p4: reads * {a: Text, c: Text, e: Text}
        v5: reads * {URL a}                       //  5   6
        v6: reads * {URL c}                       //   7 8
        v7: reads * {URL a, URL b}                //    9
        v8: reads * {URL c, URL d}
        v9: reads * {URL a, URL b, URL c, URL d}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));

    // Traversal is breadth-first; nodes within a row are in the same order as in the manifest.
    assert.deepStrictEqual(res.nodes, [
      {name: 'S_P0', parents: '',           extras: 'a', shares: false},
      {name: 'S_V5', parents: '',           extras: 'a', shares: false},
      {name: 'S_V6', parents: '',           extras: 'c', shares: false},
      {name: 'S_P1', parents: 'S_P0',       extras: 'b', shares: true},
      {name: 'S_P2', parents: 'S_P0',       extras: 'c', shares: true},
      {name: 'S_V7', parents: 'S_V5',       extras: 'b', shares: false},
      {name: 'S_V8', parents: 'S_V6',       extras: 'd', shares: false},
      {name: 'S_P3', parents: 'S_P1',       extras: 'd', shares: false},
      {name: 'S_P4', parents: 'S_P2',       extras: 'e', shares: false},
      {name: 'S_V9', parents: 'S_V7, S_V8', extras: '',  shares: false},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('mesh graph', async () => {
    //    1:a  2:b
    //    |  \/  |
    //    |  /\  |
    //  3:abc  4:abd
    //      \  /
    //    5:abcde
    const manifest = await Manifest.parse(`
      particle M
        h1: reads * {a: Text}
        h2: reads * {b: Text}
        h3: reads * {a: Text, b: Text, c: Text}
        h4: reads * {a: Text, b: Text, d: Text}
        h5: reads * {a: Text, b: Text, c: Text, d: Text, e: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'M_H1', parents: '',           extras: 'a', shares: false},
      {name: 'M_H2', parents: '',           extras: 'b', shares: false},
      {name: 'M_H3', parents: 'M_H1, M_H2', extras: 'c', shares: true},
      {name: 'M_H4', parents: 'M_H1, M_H2', extras: 'd', shares: true},
      {name: 'M_H5', parents: 'M_H3, M_H4', extras: 'e', shares: false},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('jump graph', async () => {
    // Check that a descendant connection that jumps past multiple levels of the
    // graph doesn't cause incorrect ordering.
    //
    //  1:a   2:x
    //   |     |
    //  3:ab   |
    //   |     |
    //  4:abc  |
    //     \   |
    //     5:abcx
    const manifest = await Manifest.parse(`
      particle J
        h1: reads * {a: Text}
        h2: reads * {x: Text}
        h3: reads * {a: Text, b: Text}
        h4: reads * {a: Text, b: Text, c: Text}
        h5: reads * {a: Text, b: Text, c: Text, x: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'J_H1', parents: '',           extras: 'a', shares: false},
      {name: 'J_H2', parents: '',           extras: 'x', shares: false},
      {name: 'J_H3', parents: 'J_H1',       extras: 'b', shares: false},
      {name: 'J_H4', parents: 'J_H3',       extras: 'c', shares: false},
      {name: 'J_H5', parents: 'J_H2, J_H4', extras: '',  shares: false},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('unconnected graph with aliased schema', async () => {
    // Use more realistic field names and connection types, and check that schema names are
    // ignored outside of the more-specific-than comparison.
    const manifest = await Manifest.parse(`
      particle Test
        name: reads Widget {t: Text}
        age: writes Data {n: Number}
        moniker: reads [Thing Product {z: Text}]
        oldness: reads writes [Data {n: Number}]
        mainAddress: writes Reference<* {u: URL}>
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'Test_Name',        parents: '', extras: 't', shares: false},
      {name: 'TestInternal1',    parents: '', extras: 'n', shares: false},
      {name: 'Test_Moniker',     parents: '', extras: 'z', shares: false},
      {name: 'Test_MainAddress', parents: '', extras: 'u', shares: false},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'TestInternal1': ['Test_Age', 'Test_Oldness']
    });
  });

  it('collections and handle-level references do not affect the graph', async () => {
    const manifest = await Manifest.parse(`
      particle W
        h1: reads Reference<* {a: Text}>
        h2: reads [* {a: Text, b: Text}]
        h3: reads [Reference<* {a: Text, b: Text, c: Text}>]
        h4: reads * {a: Text, b: Text, r: [Reference<* {d: Text}>]}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'W_H1',   parents: '',     extras: 'a', shares: false},
      {name: 'W_H4_R', parents: '',     extras: 'd', shares: false},
      {name: 'W_H2',   parents: 'W_H1', extras: 'b', shares: false},
      {name: 'W_H3',   parents: 'W_H2', extras: 'c', shares: true},
      {name: 'W_H4',   parents: 'W_H2', extras: 'r', shares: true},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('complex graph', async () => {
    // Handles are declared in a different order from their graph "position" but
    // named using their numeric order in which their classes are generated.
    //
    //          1:a
    //           |
    //          3:ab      2:d
    //         /    \     / \
    //       6:abc   5:abd   4:dx
    //       /   \    /
    //  8:abcy   7:abcd
    //              |
    //           9:abcde
    const manifest = await Manifest.parse(`
      particle X
        h4: reads * {d: Text, x: Text}
        h8: reads * {a: Text, b: Text, c: Text, y: Text}
        h1: reads * {a: Text}
        h6: reads * {a: Text, b: Text, c: Text}
        h9: reads * {a: Text, b: Text, c: Text, d: Text, e: Text}
        h2: reads * {d: Text}
        h7: reads * {a: Text, b: Text, c: Text, d: Text}
        h5: reads * {a: Text, b: Text, d: Text}
        h3: reads * {a: Text, b: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'X_H1', parents: '',           extras: 'a', shares: false},
      {name: 'X_H2', parents: '',           extras: 'd', shares: false},
      {name: 'X_H3', parents: 'X_H1',       extras: 'b', shares: false},
      {name: 'X_H4', parents: 'X_H2',       extras: 'x', shares: true},
      {name: 'X_H5', parents: 'X_H2, X_H3', extras: '',  shares: true},
      {name: 'X_H6', parents: 'X_H3',       extras: 'c', shares: true},
      {name: 'X_H7', parents: 'X_H5, X_H6', extras: '',  shares: true},
      {name: 'X_H8', parents: 'X_H6',       extras: 'y', shares: true},
      {name: 'X_H9', parents: 'X_H7',       extras: 'e', shares: false},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('field slicing', async () => {
    // Check that more complicated sequences of field combinations work.
    //
    //  3:d    1:a   2:bc    4:be   5:f   11:qr
    //    \    / \    |        |     |      |
    //    6:ade   7:abcgh   8:beghi  |    12:qrs
    //                 \     /       |
    //                9:abceghi      |
    //                        \      |
    //                       10:abcefghij
    const manifest = await Manifest.parse(`
      particle F
        h1: reads * {a: Text}
        h2: reads * {b: Text, c: Text}
        h3: reads * {d: Text}
        h4: reads * {b: Text, e: Text}
        h5: reads * {f: Text}
        h6: reads * {a: Text, d: Text, e: Text}
        h7: reads * {a: Text, b: Text, c: Text, g: Text, h: Text}
        h8: reads * {b: Text, e: Text, g: Text, h: Text, i: Text}
        h9: reads * {a: Text, b: Text, c: Text, e: Text, g: Text, h: Text, i: Text}
        h10: reads * {a: Text, b: Text, c: Text, e: Text, f: Text, g: Text, h: Text, i: Text, j: Text}
        h11: reads * {q: Text, r: Text}
        h12: reads * {q: Text, r: Text, s: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
       {name: 'F_H1',  parents: '',           extras: 'a',   shares: false},
       {name: 'F_H2',  parents: '',           extras: 'bc',  shares: false},
       {name: 'F_H3',  parents: '',           extras: 'd',   shares: false},
       {name: 'F_H4',  parents: '',           extras: 'be',  shares: false},
       {name: 'F_H5',  parents: '',           extras: 'f',   shares: false},
       {name: 'F_H11', parents: '',           extras: 'qr',  shares: false},
       {name: 'F_H6',  parents: 'F_H1, F_H3', extras: 'e',   shares: true},
       {name: 'F_H7',  parents: 'F_H1, F_H2', extras: 'gh',  shares: true},
       {name: 'F_H8',  parents: 'F_H4',       extras: 'ghi', shares: false},
       {name: 'F_H12', parents: 'F_H11',      extras: 's',   shares: false},
       {name: 'F_H9',  parents: 'F_H7, F_H8', extras: '',    shares: false},
       {name: 'F_H10', parents: 'F_H5, F_H9', extras: 'j',   shares: false},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('nested schemas use camel-cased path names', async () => {
    const manifest = await Manifest.parse(`
      particle Names
        data: reads * {outer: Reference<* {t: Text, inner: Reference<* {u: URL}>}>}
        dupe: reads * {t: Text, inner: Reference<* {u: URL}>}
    `);
    const graph = new SchemaGraph(manifest.particles[0]);
    const res = convert(graph);
    assert.deepStrictEqual(res.nodes.map(x => x.name), [
      'NamesInternal2', 'NamesInternal1', 'Names_Data'
    ]);
    assert.deepStrictEqual(res.aliases, {
      'NamesInternal1': ['Names_Data_Outer', 'Names_Dupe'],
      'NamesInternal2': ['Names_Data_Outer_Inner', 'Names_Dupe_Inner'],
    });
  });

  it('aliased nested schemas', async () => {
    // The handle schemas form a linear chain (h1 -> h2 -> h3) and the reference schemas
    // create a separate, single class with two aliases.
    const manifest = await Manifest.parse(`
      particle N
        h1: reads * {a: Text}
        h2: reads * {a: Text, r: Reference<* {b: Text}>}
        h3: reads * {a: Text, r: Reference<* {b: Text}>, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'N_H1',       parents: '',     extras: 'a', shares: false},
      {name: 'NInternal1', parents: '',     extras: 'b', shares: false},
      {name: 'N_H2',       parents: 'N_H1', extras: 'r', shares: false},
      {name: 'N_H3',       parents: 'N_H2', extras: 'c', shares: false},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'NInternal1': ['N_H2_R', 'N_H3_R']
    });
  });

  it('all shared nested schemas are aliased appropriately', async () => {
    // For h1: fields r and s both have multiply-nested references leading to the same innermost
    // schema '* {a: Text}'. We want a common class name for each level of the nesting stack, with
    // type aliases set up for both "sides" of the reference chain. h2 and h3 also end up using
    // the same innermost schema, so they should also have aliases set up.
    const manifest = await Manifest.parse(`
      particle Q
        h1: reads * {r: Reference<* {t: Reference<* {u: Reference<* {a: Text}>}>}>, \
              s: Reference<* {t: Reference<* {u: Reference<* {a: Text}>}>}>}
        h2: reads * {a: Text}
        h3: reads * {v: Reference<* {a: Text}>}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'QInternal3', parents: '', extras: 'a',  shares: false},
      {name: 'Q_H3',       parents: '', extras: 'v',  shares: false},
      {name: 'QInternal2', parents: '', extras: 'u',  shares: false},
      {name: 'QInternal1', parents: '', extras: 't',  shares: false},
      {name: 'Q_H1',       parents: '', extras: 'rs', shares: false},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'QInternal1': ['Q_H1_R', 'Q_H1_S'],
      'QInternal2': ['Q_H1_R_T', 'Q_H1_S_T'],
      'QInternal3': ['Q_H1_R_T_U', 'Q_H1_S_T_U', 'Q_H2', 'Q_H3_V'],
    });
  });

  it('diamond graph using nested schemas', async () => {
    //       1:a      3:rs
    //      /   \
    //  3R:ab   3S:ac
    //      \   /
    //      2:abc
    const manifest = await Manifest.parse(`
      particle I
        h1: reads * {a: Text}
        h2: reads * {a: Text, b: Text, c: Text}
        h3: reads * {r: Reference<* {a: Text, b: Text}>, s: Reference<* {a: Text, c: Text}>}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'I_H1',   parents: '',               extras: 'a',  shares: false},
      {name: 'I_H3_R', parents: 'I_H1',           extras: 'b',  shares: true},
      {name: 'I_H3_S', parents: 'I_H1',           extras: 'c',  shares: true},
      {name: 'I_H3',   parents: '',               extras: 'rs', shares: false},
      {name: 'I_H2',   parents: 'I_H3_R, I_H3_S', extras: '',   shares: false},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('deeply nested schemas', async () => {
    const manifest = await Manifest.parse(`
      particle Y
        h1: reads * {r: Reference<* {a: Text}>}
        h2: reads * {a: Text, s: Reference<* {a: Text}>}
        h3: reads * {t: Reference<* {b: Text, u: Reference<* {b: Text, c: Text, v: Reference<* {d: Text}>}>}>}
        h4: reads * {a: Text, d: Text, e: Text}
        h5: reads * {b: Text, c: Text, v: Reference<* {d: Text}>}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'YInternal1', parents: '',                       extras: 'a',   shares: false},
      {name: 'YInternal3', parents: '',                       extras: 'd',   shares: false},
      {name: 'Y_H1',       parents: '',                       extras: 'r',   shares: false},
      {name: 'Y_H2',       parents: 'YInternal1',             extras: 's',   shares: true},
      {name: 'Y_H4',       parents: 'YInternal1, YInternal3', extras: 'e',   shares: true},
      {name: 'YInternal2', parents: '',                       extras: 'bcv', shares: false},
      {name: 'Y_H3_T',     parents: '',                       extras: 'bu',  shares: false},
      {name: 'Y_H3',       parents: '',                       extras: 't',   shares: false},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'YInternal1': ['Y_H1_R', 'Y_H2_S'],
      'YInternal2': ['Y_H3_T_U', 'Y_H5'],
      'YInternal3': ['Y_H3_T_U_V', 'Y_H5_V'],
    });
  });

  it('nested schema matching one further down the graph outputs in correct order', async () => {
    //      1:a
    //     /   \
    //  3:ab   2:ar
    //    |
    //  4:abc == 2R:abc
    const manifest = await Manifest.parse(`
      particle V
        h1: reads * {a: Text}
        h2: reads * {a: Text, r: Reference<* {a: Text, b: Text, c: Text}>}
        h3: reads * {a: Text, b: Text}
        h4: reads * {a: Text, b: Text, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'V_H1',       parents: '',     extras: 'a', shares: false},
      {name: 'V_H3',       parents: 'V_H1', extras: 'b', shares: true},
      {name: 'VInternal1', parents: 'V_H3', extras: 'c', shares: false},
      {name: 'V_H2',       parents: 'V_H1', extras: 'r', shares: true},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'VInternal1': ['V_H2_R', 'V_H4']
    });
  });

  it('nested schemas with various descendant patterns', async () => {
    const manifest = await Manifest.parse(`
      particle R
        // Starting node with a reference
        h1: reads * {r: Reference<* {a: Text}>}

        // Starting node with a reference descending from h1
        h2: reads * {s: Reference<* {a: Text, b: Text}>}

        // Separate starting node
        k1: reads * {i: Reference<* {n: Number}>}

        // Descendant node with multiple independent references
        h3: reads * {r: Reference<* {a: Text}>, t: Reference<* {c: Text}>, u: Reference<* {d: Text}>}

        // Descendant node with co-descendant reference
        h4: reads * {r: Reference<* {a: Text}>, v: Reference<* {a: Text, e: Text}>}

        // Separate starting node with co-descendant reference
        k2: reads * {j: Reference<* {n: Number, o: Number}>}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'RInternal1', parents: '',           extras: 'a',  shares: false},
      {name: 'R_K1_I',     parents: '',           extras: 'n',  shares: false},
      {name: 'R_H3_T',     parents: '',           extras: 'c',  shares: false},
      {name: 'R_H3_U',     parents: '',           extras: 'd',  shares: false},
      {name: 'R_H1',       parents: '',           extras: 'r',  shares: false},
      {name: 'R_H2_S',     parents: 'RInternal1', extras: 'b',  shares: true},
      {name: 'R_H4_V',     parents: 'RInternal1', extras: 'e',  shares: true},
      {name: 'R_H2',       parents: '',           extras: 's',  shares: false},
      {name: 'R_K1',       parents: '',           extras: 'i',  shares: false},
      {name: 'R_K2_J',     parents: 'R_K1_I',     extras: 'o',  shares: false},
      {name: 'R_K2',       parents: '',           extras: 'j',  shares: false},
      {name: 'R_H3',       parents: 'R_H1',       extras: 'tu', shares: true},
      {name: 'R_H4',       parents: 'R_H1',       extras: 'v',  shares: true},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'RInternal1': ['R_H1_R', 'R_H3_R', 'R_H4_R']
    });
  });
});
