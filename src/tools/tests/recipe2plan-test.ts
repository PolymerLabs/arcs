/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {fs} from '../../platform/fs-web.js';
import {recipe2plan, OutputFormat} from '../recipe2plan.js';
import {Flags} from '../../runtime/flags.js';
import {ManifestProto} from '../manifest-proto.js';
import {Runtime} from '../../runtime/runtime.js';

const inputManifestPath = 'java/arcs/core/data/testdata/WriterReaderExample.arcs';

describe('recipe2plan', () => {
  it('generates Kotlin plans from recipes in a manifest', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Runtime.parseFile(inputManifestPath);
    assert.deepStrictEqual(
      await recipe2plan(manifest, OutputFormat.Kotlin),
      fs.readFileSync('src/tools/tests/goldens/WriterReaderExample.kt', 'utf8'),
      `Golden is out of date! Make sure the new script is correct. If it is, update the goldens with: 
$ tools/update-goldens \n\n`
    );
  }));
  it('generates Proto plans from recipes in a manifest', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Runtime.parseFile(inputManifestPath);
    const encoded = await recipe2plan(manifest, OutputFormat.Proto) as Uint8Array;
    const decoded = ManifestProto.decode(encoded);

    // Only validating that the output can be can be decoded as a ManifestProto and right counts.
    // Tests for for encoding works are in manifest2proto-test.ts.
    assert.lengthOf(decoded['recipes'], 5);
    assert.lengthOf(decoded['particleSpecs'], 3);
  }));
  it('filters generated plans by provided name', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Runtime.parseFile(inputManifestPath);
    const encoded = await recipe2plan(manifest, OutputFormat.Proto, 'Consumption') as Uint8Array;
    const decoded = ManifestProto.decode(encoded);
    assert.lengthOf(decoded['recipes'], 1);
    assert.lengthOf(decoded['particleSpecs'], 1);
  }));
  it('allows namespace to prefix particle path', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Runtime.parse(`
    meta
      namespace: arcs.core.data.testdata
      
    particle Writer in '.Writer'
      data: writes Thing {name: Text}
      
    particle Reader in 'arcs.core.data.testdata.Reader'
      data: reads Thing {name: Text}
      
    particle Intermediary in '.subdir.Intermediary'
      data: reads writes Thing {name: Text}
      
    recipe Namespace
      data: create 'some-handle' @persistent
      
      Writer
        data: writes data
      Intermediary
        data: reads writes data
      Reader
        data: reads data
    `);
    assert.deepStrictEqual(
      await recipe2plan(manifest, OutputFormat.Kotlin, 'Namespace'),
      `\
/* ktlint-disable */
@file:Suppress("PackageName", "TopLevelName")

package arcs.core.data.testdata

//
// GENERATED CODE -- DO NOT EDIT
//

import arcs.core.data.*
import arcs.core.storage.StorageKeyParser

object NamespacePlan : Plan(
    listOf(
        Particle(
            "Intermediary",
            "arcs.core.data.testdata.subdir.Intermediary",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse("create://some-handle?Persistent"),
                    HandleMode.ReadWrite,
                    SingletonType(EntityType(Intermediary_Data.SCHEMA)),
                    Ttl.Infinite
                )
            )
        ),
        Particle(
            "Reader",
            "arcs.core.data.testdata.Reader",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse("create://some-handle?Persistent"),
                    HandleMode.Read,
                    SingletonType(EntityType(Reader_Data.SCHEMA)),
                    Ttl.Infinite
                )
            )
        ),
        Particle(
            "Writer",
            "arcs.core.data.testdata.Writer",
            mapOf(
                "data" to HandleConnection(
                    StorageKeyParser.parse("create://some-handle?Persistent"),
                    HandleMode.Write,
                    SingletonType(EntityType(Writer_Data.SCHEMA)),
                    Ttl.Infinite
                )
            )
        )
    )
)
`
    );

  }));
});
