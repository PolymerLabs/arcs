// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import mocha from 'mocha';
import chai from 'chai';
import chaiHttp from 'chai-http';

// TODO figure out why this doesn't work yet..
//import 'chai/register-expect';

import { app } from '../src/App';

chai.use(chaiHttp);
const expect = chai.expect;

describe('baseRoute', () => {
  it('/ should be static html', () => {
    return chai
      .request(app)
      .get('/')
      .then(res => {
        expect(res.type).to.eql('text/html');
      });
  });

  it('/ should have a welcome message', () => {
    return chai
      .request(app)
      .get('/')
      .then(res => {
        expect(res.text).to.include('Welcome to Arcs');
      });
  });
});
