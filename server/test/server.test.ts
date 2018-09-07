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
        console.log('aaa' + res.body.message);
        expect(res.text).to.include('Welcome to Arcs');
      });
  });
});
