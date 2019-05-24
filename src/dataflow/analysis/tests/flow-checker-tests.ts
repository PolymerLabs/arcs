/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Recipe} from '../../../runtime/recipe/recipe.js';
import {FlowAssertion} from '../flow-assertion.js';
import {FlowConfig} from '../flow-config.js';
import {FlowChecker} from '../flow-checker.js';

const baseAssertions = 
`
noTrustWrite: 0 : trusted particles : write to : any : particle
// This is a comment
pii Only To Trusted: all : sensitive data : is seen by : 0 : untrusted particles
piiOnlyToTrustedAlt: 0 : untrusted particles : see : any : sensitive data
trustedDontWrite: all : trusted particles that see : any : sensitive data : do not write
resolvesExact: any : recipe : resolves exactly
onlyTrustedDontResolve: 0 : untrusted particles : do not resolve
onlyTrustedDontResolveAlt: all : untrusted particles : resolve
noSideChannels: 0 : side channels : exist
seesSensitive: any : recipe : sees : any: sensitive data
seesSensitiveAlt: any : particle : sees : any: sensitive data
oneParticlePerHandle: all : handles that are written : are written to by : 1 : particle
noUntrustedReadsTrusted: 0 : untrusted particle : reads : any : handle that is written to by : any : trusted particle
noUntrustedReachableFromTrusted: 0 : untrusted particle : is reachable from : any : trusted particle
noTrustedSideChanneltoUntrusted: 0 : trusted particle : writes to : any : side channel that writes to : any : untrusted particle
`;

describe('Dataflow analysis', () => {
  it('An assertion parses and sets name and source', () => {
    const a = baseAssertions.split('\n')[1];
    let assertion;
    try {
      assertion = new FlowAssertion(a);
    } catch (e) {
      assert.fail(e);
    }
    assert.equal('noTrustWrite', assertion.name);
    assert.equal(a, assertion.source);
  });
  // These check various parse failures, but probably aren't exhaustive
  it('Empty name fails to parse', () => {
    let threw = false;
    try {
      const a = new FlowAssertion(': 0 : trusted particles : write to : any : particle');
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });
  it('Object without quantifier fails to parse', () => {
    let threw = false;
    try {
      const a = new FlowAssertion('noTrustWrite : trusted particles : write to : any : particle');
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });
  it('Object with incorrect quantifier fails to parse', () => {
    let threw = false;
    try {
      const a = new FlowAssertion('noTrustWrite: O : trusted particles : write to : any : particle');
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });
  it('Object with unknown name fails to parse', () => {
    let threw = false;
    try {
      const a = new FlowAssertion('noTrustWrite: 0 : trusting particles : write to : any : particle');
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });
  it('Object with incorrect filter predicate fails to parse', () => {
    let threw = false;
    try {
      const a = new FlowAssertion('noUntrustedReadsTrusted: 0 : untrusted particle : reads : any : handle thet is written to by : any : trusted particle');
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });
  it('Object with incorrect negative fails to parse', () => {
    let threw = false;
    try {
      const a = new FlowAssertion('onlyTrustedDontResolve: 0 : untrusted particles : don\'t resolve');
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });
  it('Predicate with unknown name fails to parse', () => {
    let threw = false;
    try {
      const a = new FlowAssertion('noTrustWrite: 0 : trusted particles : writer to : any : particle');
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });

  it('Empty config file throws', () => {
    let threw = false;
    try {
      const c = new FlowConfig('  ');
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });
  it('Comment-only config throws', () => {
    let threw = false;
    try {
      const c = new FlowConfig('// This is a comment');
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });

  it('FlowConfig parses base set of assertions', () => {
    try {
      const c = new FlowConfig(baseAssertions);
    } catch (e) {
      assert.fail(e);
    }
  });
  it('Config with duplicate assertion names throws', () => {
    let threw = false;
    try {
      const c = new FlowConfig(`
noTrustWrite: 0 : trusted particles : write to : any : particle
noTrustWrite: 0 : trusted particles : write to : any : particle
`);
    } catch (e) {
      threw = true;
    }
    assert.equal(true, threw);
  });

  // This test, while trivial, does in fact test that the code works, because
  // the code currently always returns false. Once the test fails, it serves as
  // a reminder to write a real test.
  it('flowcheck fails', () => {
    const checker = new FlowChecker(new FlowConfig(baseAssertions));
    assert.equal(false, checker.flowcheck(new Recipe()).result);
  });
});