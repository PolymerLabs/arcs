package arcs.api;

import java.util.HashMap;
import java.util.Map;

public abstract class StorageProxy implements Store {
  public final String id;
  public final String name;
  public final Type type;
  protected boolean listenerAttached;
  protected Map<Handle, NativeParticle> observers;
  PECInnerPort port;

  protected StorageProxy(String id, Type type, PECInnerPort port, String name) {
      this.id = id;
      this.port = port;
      this.type = type;
      this.name = name;
      this.listenerAttached = false;
      this.observers = new HashMap<Handle, NativeParticle>();
  }

  public void register(NativeParticle particle, Handle handle) {
    if (!handle.canRead) {
      return;
    }

    observers.put(handle, particle);

    if (!listenerAttached) {
      port.InitializeProxy(this); // TODO: pass `onSynchronize` callback to the port.
      listenerAttached = true;
    }

    // TODO: finish implementation.
  }

  public void onSynchronize(PortableJson data) {
    // TODO: implement.
  }
}
