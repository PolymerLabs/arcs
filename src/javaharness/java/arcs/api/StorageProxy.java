package arcs.api;

import arcs.crdt.CRDTCollection;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

public abstract class StorageProxy implements Store {
  public final String id;
  public final String name;
  public final Type type;
  protected Integer version = null;
  protected boolean listenerAttached = false;
  protected boolean keepSynced = false;
  protected Map<Handle, Particle> observers = new HashMap<>();
  PECInnerPort port;

  protected StorageProxy(String id, Type type, PECInnerPort port, String name) {
      this.id = id;
      this.port = port;
      this.type = type;
      this.name = name;
  }

  public void register(Particle particle, Handle handle) {
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
    // Bail if we're not in synchronized mode or this is a stale event.
    if (!this.keepSynced) {
      return;
    }

    int version = data.getInt("version");
    if (version <= this.version) {
      throw new AssertionError("StorageProxy " + id + " received a stale update version " +
          version + "; current is " + this.version);
    }

    // TODO: implement updates queue.
    if (!updateModel(version, data)) {
      return;
    }

    notify("update", data);
  }

  public void onSynchronize(PortableJson data) {
    int version = data.getInt("version");
    if (this.version != null && version <= this.version.intValue()) {
      throw new AssertionError("StorageProxy " + id + " received stale model version " +
          version + "; current is " + this.version);
    }

    PortableJson model = data.getObject("model");
    if (!synchronizeModel(version, model)) {
      return;
    }

    notify("sync", model);
    // TODO: finish implementation.
  }

  void notify(String kind, PortableJson details) {
    for (Map.Entry<Handle, Particle> observer : observers.entrySet()) {
      observer.getKey().notify(kind, observer.getValue(), details);
    }
  }

  protected abstract boolean synchronizeModel(int version, PortableJson model);
  protected abstract boolean updateModel(int version, PortableJson data);
}
