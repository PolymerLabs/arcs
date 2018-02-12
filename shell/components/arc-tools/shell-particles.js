/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import Xen from '../xen/xen.js';

class ShellParticles extends Xen.Base {
  static get observedAttributes() { return ['arc']; }
  _update(props, state, lastProps) {
    if (props.arc) {
      let slots = props.arc.pec.slotComposer._slots;
      slots.forEach(slot => {
        let root = slot._context && slot._context._context;
        if (root) {
          let {_name, _particle} = slot._consumeConn;
          root.setAttribute('particle-host', `${_name}::${_particle._name}`);
        }
      });
    }
  }
}
ShellParticles.log = Xen.Base.logFactory('ShellParticles', '#7b5e57');
ShellParticles.warn = Xen.Base.logFactory('ShellParticles', '#7b5e57', 'warn');
customElements.define('shell-particles', ShellParticles);
