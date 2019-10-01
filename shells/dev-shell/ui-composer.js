import {SlotObserver} from '../lib/xen-renderer.js';
import {UiSlotComposer} from '../../build/runtime/ui-slot-composer.js';

export const createUiComposer = domRoot => {
  const composer = new UiSlotComposer();
  const observer = new SlotObserver(domRoot);
  composer.observeSlots(observer);
  return composer;
};
