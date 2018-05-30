/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from './chai-web.js';
import * as util from '../testing/test-util.js';
import {MockDomSlot, MockDomContext} from '../testing/mock-dom-slot.js';

function createDomSlot() {
  return new MockDomSlot(/* consumeConn= */ {particle: {name: 'MyParticle', connections: []}, slotSpec: {}, name: 'slotName'}, 'dummy-arc');
}

describe('dom-slot', function() {
  it('set context', function() {
    let slot = createDomSlot();
    let doRenderCount = 0;
    slot._doRender = () => { ++doRenderCount; };
    assert.isNull(slot._context);

    // context was null; set to null - nothing happens.
    slot.setContext(null);
    assert.isNull(slot._context);

    // context was null; set none null - initializes DOM context
    slot.setContext('dummy-context');
    assert.isTrue(slot.getContext() instanceof MockDomContext);
    let clearCount = 0;
    slot.getContext().clear = () => { clearCount++; };
    assert.equal('dummy-context', slot.getContext().context);
    assert.equal(0, doRenderCount);

    // context was NOT null; set none null - updates DOM context, and calls doRender
    slot.setContext('other-dummy-context');
    assert.equal(1, clearCount);
    assert.equal(1, doRenderCount);
    assert.equal('other-dummy-context', slot.getContext().context);

    // set context to NULL.
    slot.setContext(null);
    assert.equal(1, doRenderCount);
    assert.isNull(slot._context);
  });
  it('set content', async () => {
    let slot = createDomSlot();
    let doRenderCount = 0;
    let _doRenderImpl = slot._doRender;
    slot._doRender = () => {
      ++doRenderCount;
      _doRenderImpl.call(slot);
    };
    slot.populateHandleDescriptions = async () => {};
    assert.isNull(slot._model);

    // model and context are null; set content to null - nothing happens.
    await slot.setContent(null);
    assert.isNull(slot._model);
    assert.equal(0, doRenderCount);

    // set content to non-NULL - still nothing happens, because context is null.
    await slot.setContent({content: 'foo'});
    assert.isNull(slot._model);
    assert.equal(0, doRenderCount);

    // set context to dummy
    await slot.setContext('dummy-context');
    let clearCount = 0;
    let stampTemplateCount = 0;
    let updateModelCount = 0;
    let theTemplate;
    slot.getContext().clear = () => { clearCount++; };
    slot.getContext().stampTemplate = (eventHandler) => stampTemplateCount++;
    slot.getContext().updateModel = (model) => updateModelCount++;
    slot.getContext().setTemplate = (templatePrefix, templateName, template) => theTemplate = template;
    slot.getContext().hasTemplate = (templateName) => { return !!theTemplate; };
    // Set content to null - context is cleared.
    await slot.setContent(null);
    assert.isNull(slot._model);
    assert.equal(0, doRenderCount);
    assert.equal(1, clearCount);
    assert.equal(0, stampTemplateCount);
    assert.equal(0, updateModelCount);

    // Set content with template: templates map is updated and slot is rendered.
    assert.isFalse(slot.getContext().hasTemplate());
    await slot.setContent({template: 'my template', templateName: 'default'});
    assert.isNull(slot._model);
    assert.equal('my template', theTemplate);
    assert.equal(1, doRenderCount);
    assert.equal(1, clearCount);
    assert.equal(1, stampTemplateCount);
    assert.equal(0, updateModelCount);

    // Set content with template and model - template is overriden, model is set and slot is re-rendered.
    await slot.setContent({template: 'my other template', templateName: 'default', model: {foo: 'bar'}});
    assert.deepEqual({foo: 'bar'}, slot._model);
    assert.isTrue(slot.getContext().hasTemplate());
    assert.equal('my other template', theTemplate);
    assert.equal(2, doRenderCount);
    assert.equal(2, stampTemplateCount);
    assert.equal(1, updateModelCount);

    // Set content with only model - model is set and slot is re-rendered.
    await slot.setContent({model: {foo: 'far'}});
    assert.deepEqual({foo: 'far'}, slot._model);
    assert.equal('my other template', theTemplate);
    assert.equal(3, doRenderCount);
    assert.equal(3, stampTemplateCount);
    assert.equal(2, updateModelCount);

    // set content to null - context is cleared, and model is set to null.
    await slot.setContent(null);
    assert.isNull(slot._model);
    assert.equal('my other template', theTemplate);
    assert.equal(3, doRenderCount);
  });
  it('construct render request', function() {
    let slot = createDomSlot();
    slot._context = new MockDomContext();
    // request template, if not available yet.
    assert.deepEqual(['model', 'template'], slot.constructRenderRequest());

    // only request model, if template already found.
    slot.setContent({template: 'dummy-template', templateName: 'default'}, {});
    assert.deepEqual(['model'], slot.constructRenderRequest());
  });
});
