## Notes on rendering pipeline

```js
DomParticle::(inner)
  setViews() => _renderViews()
  _renderViews() => _renderToSlot()
  _renderToSlot() => slot<let>.render() 
  this._pec._apiPort.RenderSlot() => isolate => this.slotComposer.renderSlot


DomSlot::(outer)
  render(content, eventHandler)
    _setContent(content)
      does various stamping/intepolating work
    addEventListeners
    return _findInnerSlotInfos
```

## Notes on plumbing through the PEC barrier:

* register an incoming message

  `api-channel.js::registerHandler(<msgName>, <values-spec>)`
* register an outgoing message:

  `api-channel.js::registerCall(<msgName>, <values-spec>)`

Example: plumbing RenderSlot
```js
  PECOuterPort::this.registerHandler("RenderSlot", {particle: this.Mapped, content: this.Direct});
  PECInnerPort::this.registerCall("RenderSlot", {particle: this.Mapped, content: this.Direct});
```

plumbs `RenderSlot` message which can be sent from the inner-port to
the outer-port. `this.Mapped` indicates that `particle` object is mapped
to/from an internal id for transmission, `this.Direct` means the object is
serialized as is.

Then, in `inner-PEC.js::Slotlet`:

```js
  this._pec._apiPort.RenderSlot({content, particle: this._particle});
```

invokes RenderSlot on `this._pec` (which must be a PECInnerPort).

and in `outer-PEC.js::OuterPEC`:

```js
  this._apiPort.onRenderSlot = ({particle, content}) => {
    this.slotComposer.renderSlot(particle, content);
  };
```

registers a handler for `RenderSlot` msg on `this._apiPort` (which must be a `PECOuterPort`).
