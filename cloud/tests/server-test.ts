/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import mocha from 'mocha';
import chai from 'chai';
import {expect} from 'chai';
import chaiHttp from 'chai-http';
import {app} from '../src/pouch-db-app';

chai.use(chaiHttp);

describe('baseRoute', () => {
  it.skip('/ should be static html', () => {
    return chai
      .request(app.express)
      .get('/')
      .then(res => {
        expect(res.type).to.eql('text/html');
      });
  });

  it.skip('/ should have a welcome message', () => {
    return chai
      .request(app.express)
      .get('/')
      .then(res => {
        expect(res.text).to.include('Welcome to Arcs');
      });
  });

  it('/shells/web-shell/index.html should be static html', () => {
    return chai
      .request(app.express)
      .get('/shells/web-shell/index.html')
      .then(res => {
        expect(res.type).to.eql('text/html');
      });
  });

  it('/arcs/manifest should return id and text', () => {
    return chai
      .request(app.express)
      .get('/arcs/manifest')
      .then(res => {
        expect(res.body.id).to.equal('!manifest:manifest:');
        expect(res.body.text).to.include('schema Text');
      });
  });
});
