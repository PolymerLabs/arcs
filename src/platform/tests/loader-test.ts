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
import {Loader} from '../loader.js';

describe('PlatformLoader', () => {
  it('can substitute macros', async () => {
    const loader = new Loader({
      'https://$macro/': 'http://host:1234/here/',
      'https://$other/': '../../../',
    });

    assert.equal(loader.resolve('https://$macro/Particle.js'),
        'http://host:1234/here/Particle.js');
    assert.equal(loader.resolve('https://$other/Feature.arcs'),
        '../../../Feature.arcs');
  });
  it('can fetch wasm modules from build directory', async () => {
    const loader = new Loader({
      'https://$macro/': {
        root: 'http://host/',
        buildDir: 'bazel-bin/',
        buildOutputRegex: '\\.wasm$',
      }
    });

    assert.equal(loader.resolve('https://$macro/over/here/Particle.wasm'),
        'http://host/bazel-bin/over/here/Particle.wasm');
    assert.equal(loader.resolve('https://$macro/over/here/Feature.arcs'),
        'http://host/over/here/Feature.arcs');
  });
  it('can fetch wasm modules from build directory with internal path', async () => {
    const loader = new Loader({
      'https://$macro/': {
        root: '../../',
        path: 'over/here/',
        buildDir: 'bazel-bin/',
        buildOutputRegex: '\\.wasm$',
      }
    });

    assert.equal(loader.resolve('https://$macro/Particle.wasm'),
        '../../bazel-bin/over/here/Particle.wasm');
    assert.equal(loader.resolve('https://$macro/Feature.arcs'),
        '../../over/here/Feature.arcs');
  });
  it('can joins paths', async () => {
    const loader = new Loader({});

    assert.equal(loader.join('', 'foo.arcs'), 'foo.arcs');
    assert.equal(loader.join('/', 'a.arcs'), '/a.arcs');
    assert.equal(loader.join('a/b/c/', 'x.arcs'), 'a/b/c/x.arcs');
    assert.equal(loader.join('a/b/c/', ''), 'a/b/c/');
    assert.equal(loader.join('a/b/c/', 'd/e/f'), 'a/b/c/d/e/f');
    assert.equal(loader.join('a/b/c/', './d/e/f'), 'a/b/c/d/e/f');
    assert.equal(loader.join('a/b/c/', '/d/e/f'), '/d/e/f');
    assert.equal(loader.join('a/b/c/', '../../d/e/f'), 'a/d/e/f');
    assert.equal(loader.join('a/b/c/', '../../../d/e/f'), 'd/e/f');
    assert.equal(loader.join('/a/b/c/', '../../../d/e/f'), '/d/e/f');
  });
  it('recognizes JVM classpaths', () => {
    assert.isTrue(Loader.isJvmClasspath('com.package.Class'));
    assert.isTrue(Loader.isJvmClasspath('com.package.Class.InnerClass'));
    assert.isTrue(Loader.isJvmClasspath('com.package_.Class_.InnerClass'));
    assert.isTrue(Loader.isJvmClasspath('com.package.cloud9.MyClass'));

    assert.isFalse(Loader.isJvmClasspath('com'));
    assert.isFalse(Loader.isJvmClasspath('com.package'));
    assert.isFalse(Loader.isJvmClasspath('com.package.test'));
    assert.isFalse(Loader.isJvmClasspath('.'));
    assert.isFalse(Loader.isJvmClasspath('com.invalid.'));
    assert.isFalse(Loader.isJvmClasspath('com.invalid..ff'));
    assert.isFalse(Loader.isJvmClasspath(''));
    assert.isFalse(Loader.isJvmClasspath('com.package..Class.InnerClass'));
    assert.isFalse(Loader.isJvmClasspath('com.package.Class.InnerClass.class'));
    assert.isFalse(Loader.isJvmClasspath('.com.google.com.Class'));
    assert.isFalse(Loader.isJvmClasspath('Com.pkg.Class'));
    assert.isFalse(Loader.isJvmClasspath('0om.pkg.class'));
    assert.isFalse(Loader.isJvmClasspath('a.js'));
    assert.isFalse(Loader.isJvmClasspath('path/to/MyClass.kt'));
  });
});
