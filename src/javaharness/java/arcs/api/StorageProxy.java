package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

public abstract class StorageProxy implements Store {
  public final String id;
  public final String name;
  public final Type type;
  protected boolean listenerAttached = false;
  protected boolean keepSynced = false;
  protected Map<Handle, NativeParticle> observers = new HashMap<>();
  PECInnerPort port;

  protected StorageProxy(String id, Type type, PECInnerPort port, String name) {
      this.id = id;
      this.port = port;
      this.type = type;
      this.name = name;
  }

  public void register(NativeParticle particle, Handle handle) {
    if (!handle.canRead) {
      return;
    }

    observers.put(handle, particle);

    if (!listenerAttached) {
      port.InitializeProxy(this, json -> onUpdate(json));
      listenerAttached = true;
    }

    if (handle.options.keepSynced) {
      if (!this.keepSynced) {
        port.SynchronizeProxy(this, json -> this.onSynchronize(json));
        this.keepSynced = true;
      }

      // TODO: finish implementation.
      // If a handle configured for sync notifications registers after we've received the full
      // model, notify it immediately.
      // if (handle.options.notifySync && this.synchronized === SyncState.full) {
      //   const syncModel = this._getModelForSync();
      //   this.scheduler.enqueue(particle, handle, ['sync', particle, syncModel]);
      // }
    }
  }

  protected void onUpdate(PortableJson data) {
    throw new AssertionError("[onUpdate]!");
    // TODO: implement.
  }

  protected void onSynchronize(PortableJson data) {
    int version = data.getInt("version");
    PortableJson model = data.getObject("model");
    throw new AssertionError("[onSynchronize]!" + version);
    // TODO: implement.
  }
}
