package arcs.api;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import java.util.logging.Logger;

public abstract class StorageProxy implements Store {
  public final String id;
  public final String name;
  public final Type type;
  protected Integer version = null;
  protected boolean listenerAttached = false;
  protected boolean keepSynced = false;
  protected SyncState syncState = SyncState.NONE;
  protected Map<Handle, Particle> observers = new HashMap<>();
  protected List<PortableJson> updates = new ArrayList<>();
  protected PECInnerPort port;
  protected PortableJsonParser jsonParser;
  protected PortablePromiseFactory promiseFactory;
  protected StorageProxyScheduler scheduler;

  private static final Logger logger = Logger.getLogger(StorageProxy.class.getName());

  private static final String VERSION = "version";
  private static final String UPDATE = "update";
  private static final String SYNC = "sync";
  private static final String DESYNC = "desync";

  protected StorageProxy(
      String id,
      Type type,
      PECInnerPort port,
      String name,
      PortableJsonParser jsonParser,
      PortablePromiseFactory promiseFactory) {
    this.id = id;
    this.port = port;
    this.type = type;
    this.name = name;
    this.jsonParser = jsonParser;
    this.promiseFactory = promiseFactory;
    this.scheduler = new StorageProxyScheduler(promiseFactory);
  }

  abstract PortableJson getModelForSync();

  abstract boolean synchronizeModel(Integer version, PortableJson model);

  abstract PortableJson processUpdate(PortableJson operation, boolean apply);

  public void register(Particle particle, Handle handle) {
    if (!handle.canRead) {
      return;
    }

    observers.put(handle, particle);

    if (!listenerAttached) {
      port.initializeProxy(this, this::onUpdate);
      listenerAttached = true;
    }
    if (handle.options.keepSynced) {
      if (!keepSynced) {
        port.synchronizeProxy(this, this::onSynchronize);
        keepSynced = true;
      }

      // If a handle configured for sync notifications registers after we've received the full
      // model, notify it immediately.
      if (handle.options.notifySync && syncState == SyncState.FULL) {
        PortableJson syncModel = getModelForSync();
        scheduler.enqueue(particle, handle, SYNC, syncModel);
      }
    }
  }

  protected void onUpdate(PortableJson update) {
    // Immediately notify any handles that are not configured with keepSynced but do want updates.
    if (observers.keySet().stream()
            .anyMatch(handle -> !handle.options.keepSynced && handle.options.notifyUpdate)) {
      PortableJson handleUpdate = processUpdate(update, false);
      notify(UPDATE, handleUpdate, options -> !options.keepSynced && options.notifyUpdate);
    }

    // Bail if we're not in synchronized mode or this is a stale event.
    if (!keepSynced) {
      return;
    }
    int updateVersion = update.getInt(VERSION);
    if (updateVersion <= version) {
      logger.warning(
          "StorageProxy "
              + id
              + " received stale model version "
              + updateVersion
              + "current is "
              + version);
      return;
    }

    // Add the update to the queue and process. Most of the time the queue should be empty and
    // processUpdates will consume this event immediately.
    updates.add(update);
    updates.sort((a, b) -> a.getInt(VERSION) - b.getInt(VERSION));
    processUpdates();
  }

  public void onSynchronize(PortableJson data) {
    int version = data.getInt(VERSION);
    if (this.version != null && version <= this.version) {
      logger.warning(
          "StorageProxy "
              + id
              + " received stale model version "
              + version
              + "current is "
              + version);
      return;
    }

    PortableJson model = data.getArray("model");
    if (!synchronizeModel(version, model)) {
      return;
    }

    // We may have queued updates that were received after a desync; discard any that are stale
    // with respect to the received model.
    syncState = SyncState.FULL;
    while (updates.size() > 0 && updates.get(0).getInt(VERSION) <= version) {
      updates.remove(0);
    }

    notify("sync", getModelForSync(), options -> options.keepSynced && options.notifySync);
    processUpdates();
  }

  void notify(String kind, PortableJson details, Predicate<Handle.Options> predicate) {
    for (Map.Entry<Handle, Particle> observer : observers.entrySet()) {
      if (predicate.test(observer.getKey().options)) {
        observer.getKey().notify(kind, observer.getValue(), details);
      }
    }
  }

  private void processUpdates() {
    Predicate<PortableJson> updateIsNext =
        update -> update.getInt(VERSION) == version + 1;

    // Consume all queued updates whose versions are monotonically increasing from our stored one.
    while (updates.size() > 0 && updateIsNext.test(updates.get(0))) {
      PortableJson update = updates.remove(0);

      // Fold the update into our stored model.
      PortableJson handleUpdate = processUpdate(update, true);
      version = update.getInt(VERSION);

      // Notify handles configured with keepSynced and notifyUpdates (non-keepSynced handles are
      // notified as updates are received).
      if (handleUpdate != null) {
        notify(UPDATE, handleUpdate, options -> options.keepSynced && options.notifyUpdate);
      }
    }

    // If we still have update events queued, we must have received a future version are are now
    // desynchronized. Send a request for the full model and notify handles configured for it.
    if (updates.size() > 0) {
      if (syncState != SyncState.NONE) {
        syncState = SyncState.NONE;
        port.synchronizeProxy(this, this::onSynchronize);
        for (Map.Entry<Handle, Particle> observer : observers.entrySet()) {
          Handle handle = observer.getKey();
          if (handle.options.notifyDesync) {
            scheduler.enqueue(observer.getValue(), handle, DESYNC, jsonParser.emptyObject());
          }
        }
      }
    } else if (syncState != SyncState.FULL) {
      // If we were desynced but have now consumed all update events, we've caught up.
      syncState = SyncState.FULL;
    }
  }

  enum SyncState {
    NONE,
    PENDING,
    FULL
  }
}
