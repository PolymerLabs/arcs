// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle */
defineParticle(({DomParticle, html, resolver, log}) => {

  const x = resolver('https://$particles/WASM/source/main.wasm');
  const memoryStates = new WeakMap();

  let instance = null;
  let message = '';

  function syscall(instance, n, args) {
    switch (n) {
      default:
        // console.log("Syscall " + n + " NYI.");
        break;
      case /* brk */ 45: return 0;
      case /* writev */ 146:
        return instance.exports.writev_c(args[0], args[1], args[2]);
      case /* mmap2 */ 192: {
        //debugger;
        const memory = instance.exports.memory;
        let memoryState = memoryStates.get(instance);
        const requested = args[1];
        if (!memoryState) {
          memoryState = {
            object: memory,
            currentPosition: memory.buffer.byteLength,
          };
          memoryStates.set(instance, memoryState);
        }
        const cur = memoryState.currentPosition;
        if (cur + requested > memory.buffer.byteLength) {
          const need = Math.ceil((cur + requested - memory.buffer.byteLength) / 65536);
          memory.grow(need);
        }
        memoryState.currentPosition += requested;
        return cur;
      }
    }
  }

  let s = '';
  fetch(x).then(response =>
    response.arrayBuffer()
  ).then(bytes => {
    return WebAssembly.instantiate(bytes, {
      env: {
        __syscall0: function __syscall0(n) { return syscall(instance, n, []); },
        __syscall1: function __syscall1(n, a) { return syscall(instance, n, [a]); },
        __syscall2: function __syscall2(n, a, b) { return syscall(instance, n, [a, b]); },
        __syscall3: function __syscall3(n, a, b, c) { return syscall(instance, n, [a, b, c]); },
        __syscall4: function __syscall4(n, a, b, c, d) { return syscall(instance, n, [a, b, c, d]); },
        __syscall5: function __syscall5(n, a, b, c, d, e) { return syscall(instance, n, [a, b, c, d, e]); },
        __syscall6: function __syscall6(n, a, b, c, d, e, f) { return syscall(instance, n, [a, b, c, d, e, f]); },
        putc_js: function(c) {
          c = String.fromCharCode(c);
          if (c === '\n') {
            message = s;
            console.warn(s);
            s = '';
          } else {
            s += c;
          }
        }
      }
    });
  }).then(results => {
    instance = results.instance;
  }).catch(console.error);

  return class extends DomParticle {
    get template() {
      return html`<div>{{msg}}</div>`;
    }
    render() {
      let msg;
      if (instance) {
        const result = instance.exports.main();
        console.warn(result);
        msg = message;
      } else {
        msg = 'WASM is thinking...';
        this._invalidate();
      }
      return {msg};
    }
  };

});

