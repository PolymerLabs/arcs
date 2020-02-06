/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const pipeShellHref = new URL(`../pipes-shell/web/index.html?log`, location.href).href;
const renderSurfaceHref = new URL('../pipes-shell/surface/surface.html?log', location.href).href;

export const connectToPlatform = async Application => {
  // bus packet handlers
  const dispatcher = {
    ready(packet) {
      // create function which sends to Arcs runtime
      Application.send = msg => arcsProcess.ShellApi.receive(msg);
      // forward signal
      Application.ready(packet);
    },
    // hand all slot rendering requests to a uiBroker (we could differentiate
    // by modality here, or let uiBroker do it; these decisions can be composed)
    output(packet) {
      uiBroker.render(packet);
    }
  };
  // spin up runtime
  const arcsProcess = await createRuntimeProcess();
  // implements the DeviceClient side of the PipeShell bus, the bit which recieves messages
  // from the Arc Runtime
  arcsProcess.DeviceClient = {
    receive(json) {
      const packet = JSON.parse(json);
      console.log('RECEIVED: ', packet);
      //const delegate = dispatcher[packet.message] || Application.receive.bind(Application);
      const delegate = dispatcher[packet.message];
      if (delegate) {
        delegate(packet);
      } else {
        const delegate = Application[packet.message];
        if (delegate) {
          delegate.call(Application, packet);
        }
      }
    }
  };
  // uiBroker communicates with the ui surface
  const uiBroker = {
    render(packet) {
      const {content} = packet.data;
      switch (content.model && content.model.modality) {
        case 'notification':
          // delegate to Application
          Application.receive(packet.data);
          break;
        default:
          renderToSurface(packet);
          break;
      }
    }
  };
  const renderToSurface = async packet => {
    // force a surface
    await waitForRenderSurface();
    // locate the renderer
    const {renderer} = renderSurface;
    // extract packet data
    const {data, tid} = packet;
    // attach an event dispatcher
    //if (!tid) {
    //  console.warn('slot packet missing `tid`: so events are not supported');
    //} else {
      renderer.dispatch = (pid, eventlet) => {
        Application.send({message: 'event', tid, pid, eventlet});
      };
    //}
    console.log('renderer gets:', data);
    // send message to renderer
    renderer.render(data);
  };
  // forward toast events to application
  renderToasts.onclick = toast => Application.notificationClick(toast);
};

// dynamic runtime

const createRuntimeProcess = async () => {
  const frame = document.body.appendChild(Object.assign(document.createElement('iframe'), {
    src: pipeShellHref,
    style: `display: none`
  }));
  return new Promise(resolve => {
    resolve(frame.contentWindow);
  });
};

// dynamic render surface

let renderSurface;

export const waitForRenderSurface = async () => {
  if (!renderSurface) {
    renderSurface = createRenderSurface();
    // TODO(sjmiles): could wait for explicit signal, but this is MVP
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return renderSurface;
};

const createRenderSurface = () => {
  return open(renderSurfaceHref, 'Arc', 'resizable=1, scrollbars=1');
};

//
// one-off Toast impl for demonstration
//

let toasts = [];

const dom = (tag, container, props) => {
  return container.appendChild(Object.assign(document.createElement(tag), props));
};

const toastContainer = dom('div', document.body, {style: 'position: fixed; bottom: 0; right: 0; width: 300px;'});

export const addToast = msg => {
  if (!toasts.some(toast => toast.msg === msg)) {
    const toast = {
      msg
    };
    // never more than 3
    toasts = toasts.slice(0, 2);
    toasts.push(toast);
    renderToasts();
  }
};

const renderToasts = () => {
  toastContainer.innerText = '';
  toasts.forEach((toast, i) => {
    toast = dom('toast', toastContainer, {
      innerHTML: toast.msg,
      style: 'display: block; cursor: pointer; opacity: 1; margin: 32px; background: lightgreen; padding: 16px; transition: all 200ms ease-in;',
      onclick: () => {
        toasts.splice(i, 1);
        toast.style.opacity = 0;
        if (renderToasts.onclick) {
          renderToasts.onclick(toast);
        }
      }
    });
  });
};
