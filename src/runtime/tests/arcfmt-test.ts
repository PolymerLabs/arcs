/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Flags} from '../flags.js';
import {Manifest} from '../manifest.js';
import {assert} from '../../platform/chai-web.js';


describe('Parser', () => {
  describe('Stability over flags', () => {
    const oldManifestStr =
`schema S
  Text t
  description \`one-s\`
    plural \`many-ses\`
    value \`s:\${t}\`
particle SomeParticle &work in 'some-particle.js'
  out S {Text t} someParam
  modality dom
recipe SomeRecipe &someVerb1 &someVerb2
  map #someHandle as handle1
  create #newHandle as handle0
  SomeParticle as particle0
    someParam -> #tag
  description \`hello world\`
    handle0 \`best handle\``;
    const newManifestStr =
`schema S
  t: Text
  description \`one-s\`
    plural \`many-ses\`
    value \`s:\${t}\`
particle SomeParticle &work in 'some-particle.js'
  someParam: writes S {t: Text}
  modality dom
recipe SomeRecipe &someVerb1 &someVerb2
  handle1: map #someHandle
  handle0: create #newHandle
  SomeParticle as particle0
    someParam: writes #tag
  description \`hello world\`
    handle0 \`best handle\``;
    it('can revert to an old syntax', async () => {
      const newManifest = await Flags.withPostSlandlesSyntax(Manifest.parse)(newManifestStr);
      await Flags.withFlags({parseBothSyntaxes: false, defaultToPreSlandlesSyntax: true}, async () => {
        assert.strictEqual(newManifest.toString(), oldManifestStr, 'old syntax should convert to new syntax');
      })();
    });
    it('can update from an old syntax', async () => {
      const oldManifest = await Flags.withFlags({parseBothSyntaxes: false, defaultToPreSlandlesSyntax: true}, Manifest.parse)(oldManifestStr);
      await Flags.withPostSlandlesSyntax(async () => {
        assert.strictEqual(oldManifest.toString(), newManifestStr, 'new syntax should convert to old syntax');
      })();
    });
    it('parser can read two different syntaxes', async () => {
      const oldManifest = await Flags.withFlags({parseBothSyntaxes: false, defaultToPreSlandlesSyntax: true}, Manifest.parse)(oldManifestStr);
      const newManifest = await Flags.withPostSlandlesSyntax(Manifest.parse)(newManifestStr);
      await Flags.withFlags({parseBothSyntaxes: false, defaultToPreSlandlesSyntax: true}, async () => {
        assert.strictEqual(oldManifest.toString(), newManifest.toString(), 'new syntax should convert to old syntax');
      })();
      await Flags.withPostSlandlesSyntax(async () => {
        assert.strictEqual(newManifest.toString(), oldManifest.toString(), 'old syntax should convert to new syntax');
      })();
    });
  });
});
