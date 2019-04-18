import { Particle } from './particle';
import { PECInnerPort } from './api-channel';

/**
 * A representation of a consumed slot. Retrieved from a particle using
 * particle.getSlot(name)
 */
export class SlotProxy {
  readonly slotName: string;
  readonly particle: Particle;
  readonly providedSlots: Map<string, string>;
  private readonly apiPort: PECInnerPort;
  private readonly handlers = new Map<string, ((event: {}) => void)[]>();
  readonly requestedContentTypes = new Set<string>();
  private _isRendered = false;

  constructor(apiPort: PECInnerPort, particle: Particle, slotName: string, providedSlots: Map<string, string>) {
    this.apiPort = apiPort;
    this.slotName = slotName;
    this.particle = particle;
    this.providedSlots = providedSlots;
  }
  get isRendered() { return this._isRendered; }

  /**
   * renders content to the slot.
   */
  render(content) {  
    this.apiPort.Render(this.particle, this.slotName, content);

    Object.keys(content).forEach(key => { this.requestedContentTypes.delete(key); });
    // Slot is considered rendered, if a non-empty content was sent and all requested content types were fullfilled.
    this._isRendered = this.requestedContentTypes.size === 0 && (Object.keys(content).length > 0);
  }
  /** @method registerEventHandler(name, f)
   * registers a callback to be invoked when 'name' event happens.
   */
  registerEventHandler(name, f) {
    if (!this.handlers.has(name)) {
      this.handlers.set(name, []);
    }
    this.handlers.get(name).push(f);
  }
  clearEventHandlers(name) {
    this.handlers.set(name, []);
  }
  fireEvent(event) {
    for (const handler of this.handlers.get(event.handler) || []) {
      handler(event);
    }
  }
}
