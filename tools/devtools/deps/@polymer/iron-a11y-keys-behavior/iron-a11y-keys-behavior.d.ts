/**
 * DO NOT EDIT
 *
 * This file was automatically generated by
 *   https://github.com/Polymer/tools/tree/master/packages/gen-typescript-declarations
 *
 * To modify these typings, edit the source file(s):
 *   iron-a11y-keys-behavior.js
 */

export {IronA11yKeysBehavior};

/**
 * `Polymer.IronA11yKeysBehavior` provides a normalized interface for processing
 * keyboard commands that pertain to [WAI-ARIA best
 * practices](http://www.w3.org/TR/wai-aria-practices/#kbd_general_binding). The
 * element takes care of browser differences with respect to Keyboard events and
 * uses an expressive syntax to filter key presses.
 *
 * Use the `keyBindings` prototype property to express what combination of keys
 * will trigger the callback. A key binding has the format
 * `"KEY+MODIFIER:EVENT": "callback"` (`"KEY": "callback"` or
 * `"KEY:EVENT": "callback"` are valid as well). Some examples:
 *
 *      keyBindings: {
 *        'space': '_onKeydown', // same as 'space:keydown'
 *        'shift+tab': '_onKeydown',
 *        'enter:keypress': '_onKeypress',
 *        'esc:keyup': '_onKeyup'
 *      }
 *
 * The callback will receive with an event containing the following information
 * in `event.detail`:
 *
 *      _onKeydown: function(event) {
 *        console.log(event.detail.combo); // KEY+MODIFIER, e.g. "shift+tab"
 *        console.log(event.detail.key); // KEY only, e.g. "tab"
 *        console.log(event.detail.event); // EVENT, e.g. "keydown"
 *        console.log(event.detail.keyboardEvent); // the original KeyboardEvent
 *      }
 *
 * Use the `keyEventTarget` attribute to set up event handlers on a specific
 * node.
 *
 * See the [demo source
 * code](https://github.com/PolymerElements/iron-a11y-keys-behavior/blob/master/demo/x-key-aware.html)
 * for an example.
 */
interface IronA11yKeysBehavior {

  /**
   * The EventTarget that will be firing relevant KeyboardEvents. Set it to
   * `null` to disable the listeners.
   */
  keyEventTarget: EventTarget|null;

  /**
   * If true, this property will cause the implementing element to
   * automatically stop propagation on any handled KeyboardEvents.
   */
  stopKeyboardEventPropagation: boolean|null|undefined;
  _boundKeyHandlers: any[]|null|undefined;

  /**
   * own properties of everything on the "prototype".
   */
  _imperativeKeyBindings: object|null|undefined;

  /**
   * To be used to express what combination of keys  will trigger the relative
   * callback. e.g. `keyBindings: { 'esc': '_onEscPressed'}`
   */
  keyBindings: object;
  registered(): void;
  attached(): void;
  detached(): void;

  /**
   * Can be used to imperatively add a key binding to the implementing
   * element. This is the imperative equivalent of declaring a keybinding
   * in the `keyBindings` prototype property.
   */
  addOwnKeyBinding(eventString: string, handlerName: string): void;

  /**
   * When called, will remove all imperatively-added key bindings.
   */
  removeOwnKeyBindings(): void;

  /**
   * Returns true if a keyboard event matches `eventString`.
   */
  keyboardEventMatchesKeys(event: KeyboardEvent|null, eventString: string): boolean;
  _collectKeyBindings(): any;
  _prepKeyBindings(): void;
  _addKeyBinding(eventString: any, handlerName: any): void;
  _resetKeyEventListeners(): void;
  _listenKeyEventListeners(): void;
  _unlistenKeyEventListeners(): void;
  _onKeyBindingEvent(keyBindings: any, event: any): void;
  _triggerKeyHandler(keyCombo: any, handlerName: any, keyboardEvent: any): void;
}

declare const IronA11yKeysBehavior: object;
