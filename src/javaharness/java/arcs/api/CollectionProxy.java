package arcs.api;

import arcs.crdt.CollectionOperation;
import arcs.crdt.CRDTCollection;
import arcs.crdt.Referenceable;
import arcs.crdt.VersionMap;
import arcs.crdt.VersionedValue;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

class ModelValue {
  String id;
  PortableJson value;
  String storageKey;

  ModelValue(String id, PortableJson value, String storageKey) {
    this.id = id;
    this.value = value;
    this.storageKey = storageKey;
  }
}

class ModelEntry implements Referenceable {
  static final String KEYS = "keys";

  ModelValue value;
  Set<String> keys;

  ModelEntry(String id, PortableJson value, Collection<String> keys) {
    this.value = new ModelValue(id, value, null);
    this.keys = new HashSet<String>(keys);
  }

  static ModelEntry fromJson(PortableJson json) {
    Set<String> keys = new HashSet<>();
    json.getObject(KEYS).forEach(key -> keys.add(key));
    return new ModelEntry(json.getString("id"), json.getObject("value"), keys);
  }

  @Override
  public String getId() { return value.id; }
}

public class CollectionProxy extends StorageProxy implements CollectionStore {
  CRDTCollection<ModelEntry> model;

  public CollectionProxy(String id, Type type, PECInnerPort port, String name,
      PortableJsonParser jsonParser, PortablePromiseFactory promiseFactory) {
    super(id, type, port, name, jsonParser, promiseFactory);
  }

  @Override
  public PortableJson getModelForSync() {
    return thisModelToList();
  }

  @Override
  public boolean synchronizeModel(Integer version, PortableJson model) {
    this.version = version;
    List<VersionedValue<ModelEntry>> values = new ArrayList<>();
    for (int i = 0; i < model.getLength(); ++i) {
      values.add(new VersionedValue(
        ModelEntry.fromJson(model.getObject(i)),
        // TODO: here and everywhere in this file, figure out what operation's
        // `actor` field should be.
        new VersionMap(){{ put("pec", version); }}));
    }
    this.model = new CRDTCollection(values, new VersionMap(){{ put("pec", version); }});
    return true;
  }

  @Override
  public PortableJson processUpdate(PortableJson update, boolean apply) {
    if (syncState == SyncState.FULL) {
      // If we're synchronized, then any updates we sent have already been applied/notified.
      for (Map.Entry<Handle, Particle> observer : observers.entrySet()) {
        if (update.getString("originatorId") == observer.getKey().particleId) {
          return null;
        }
      }
    }
    PortableJson added = jsonParser.emptyArray();
    PortableJson removed = jsonParser.emptyArray();
    if (update.hasKey("add")) {
      for (int i = 0; i < update.getObject("add").getLength(); ++i) {
        PortableJson add = update.getObject("add").getObject(i);
        boolean effective = add.getBool("effective");
        PortableJson value = add.getObject("value");
        PortableJson keysJson = add.getObject(ModelEntry.KEYS);
        List<String> keys = new ArrayList<>(keysJson.getLength());
        for (int j = 0; j < keysJson.getLength(); ++j) { keys.add(keysJson.getString(j)); }
        if (apply && model.applyOperation(new CollectionOperation<ModelEntry>(
                CollectionOperation.Type.ADD, new ModelEntry(value.getString("id"), value, keys),
                new VersionMap(){{ put("pec", model.nextVersion("pec")); }}, "pec")) ||
           !apply && effective) {
          added.put(added.getLength(), value);
        }
      }
    } else if (update.hasKey("remove")) {
      for (int i = 0; i < update.getObject("remove").getLength(); ++i) {
        PortableJson remove = update.getObject("remove").getObject(i);
        VersionedValue vv = model.getData().get(remove.getObject("value").getString("id"));
        ModelEntry entry = (ModelEntry) vv.value;
        boolean effective = remove.getBool("effective");
        if (apply && model.applyOperation(new CollectionOperation<ModelEntry>(
              CollectionOperation.Type.REMOVE, entry, vv.version, "pec")) ||
            !apply && effective) {
          removed.put(removed.getLength(), entry.value.value);
        }
      }
    } else {
      throw new AssertionError("StorageProxy received invalid update event: " + jsonParser.stringify(update));
    }
    if (added.getLength() > 0 || removed.getLength() > 0) {
      PortableJson result = jsonParser.emptyObject().put("originatorId", update.getString("originatorId"));
      if (added.getLength() > 0) {
        result.put("add", added);
      }
      if (removed.getLength() > 0) {
        result.put("remove", removed);
      }
      return result;
    }
    return null;
  }

  @Override
  public PortablePromise<PortableJson> get(String id) {
    if (syncState == SyncState.FULL) {
      return promiseFactory.newPromise(((ModelValue) model.getData().getValue(id).value).value);
    } else {
      return promiseFactory.newPromise((resolver, rejecter) -> {
        port.HandleToList(this, result -> {
          PortableJson entity = null;
          for (int i = 0; i < result.getLength(); ++i) {
            if (id.equals(result.getObject(i).getString("id"))) {
              entity = result.getObject(i);
              break;
            }
          }
          resolver.resolve(entity);
        });
      });
    }
  }

  @Override
  public void store(PortableJson value, String keys[], String particleId) {
    PortableJson data = jsonParser.emptyObject().put("value", value)
        .put(ModelEntry.KEYS, jsonParser.fromStringArray(Arrays.asList(keys)));
    port.HandleStore(this, (unused) -> {}, data, particleId);

    if (syncState != SyncState.FULL) {
      return;
    }
    if (!model.applyOperation(new CollectionOperation<ModelEntry>(
          CollectionOperation.Type.ADD,
          new ModelEntry(value.getString("id"), value, Arrays.asList(keys)),
          new VersionMap(){{ put("pec", model.nextVersion("pec")); }},
          "pec"))) {
      return;
    }
    PortableJson update = jsonParser.emptyObject()
      .put("originatorId", particleId)
      .put("add", jsonParser.emptyArray().put(0, value));
    notify("update", update, options -> options.notifyUpdate);
  }

  @Override
  public void clear(String particleId) {
    if (syncState != SyncState.FULL) {
      port.HandleRemoveMultiple(this, (unused) -> {}, jsonParser.emptyArray(), particleId);
    }

    PortableJson items = jsonParser.emptyArray();
    for (String id : model.getData().keys()) {
      PortableJson item = jsonParser.emptyObject().put("id", id);
      PortableJson keysJson = jsonParser.emptyArray();
      ((ModelEntry) model.getData().getValue(id)).keys.forEach(
          key -> keysJson.put(keysJson.getLength(), key));
      item.put(ModelEntry.KEYS, keysJson);
      items.put(items.getLength(), item);
    }
    port.HandleRemoveMultiple(this, (unused) -> {}, items, particleId);

    PortableJson removedItems = jsonParser.emptyArray();
    for (int i = 0; i < items.getLength(); ++i) {
      PortableJson item = items.getObject(i);
      VersionedValue vv = model.getData().get(item.getString("id"));
      ModelEntry entry = (ModelEntry) vv.value;
      if (model.applyOperation(new CollectionOperation<ModelEntry>(
          CollectionOperation.Type.REMOVE, entry, vv.version, "pec"))) {
        removedItems.put(removedItems.getLength(), item.put("rawData",
            entry.value.value.getObject("rawData")));
      }
    }

    if (removedItems.getLength() > 0) {
      notify("update",
             jsonParser.emptyObject().put("originatorId", particleId).put("remove", removedItems),
             options -> options.notifyUpdate);
    }
  }

  @Override
  public void remove(String id, String keys[], String particleId) {
    if (syncState != SyncState.FULL) {
      PortableJson data = jsonParser.emptyObject().put("id", id).put(ModelEntry.KEYS, jsonParser.emptyArray());
      port.HandleRemove(this, (unused) -> {}, data, particleId);
      return;
    }

    VersionedValue vv = model.getData().get(id);
    ModelEntry entry = (ModelEntry) vv.value;
    PortableJson value = entry.value.value;
    if (value == null) {
      return;
    }
    if (keys.length == 0) {
      keys = entry.keys.toArray(new String[0]);
    }
    PortableJson data = jsonParser.emptyObject().put("id", id)
        .put(ModelEntry.KEYS, jsonParser.fromStringArray(Arrays.asList(keys)));
    port.HandleRemove(this, (unused) -> {}, data, particleId);

    if (!model.applyOperation(new CollectionOperation<ModelEntry>(
          CollectionOperation.Type.REMOVE, entry, vv.version, "pec"))) {
      return;
    }
    PortableJson update = jsonParser.emptyObject()
      .put("originatorId", particleId)
      .put("remove", jsonParser.emptyArray().put(0, value));
    notify("update", update, options -> options.notifyUpdate);
  }

  @Override
  public PortablePromise<PortableJson> toList() {
    if (syncState == SyncState.FULL) {
      return promiseFactory.newPromise(thisModelToList());
    } else {
      return promiseFactory.newPromise((resolver, rejecter) -> {
        port.HandleToList(this, resolver);
      });
    }
  }

  private PortableJson thisModelToList() {
    PortableJson result = jsonParser.emptyArray();
    model.getData().keys().stream().forEach(
        id -> result.put(result.getLength(), ((ModelEntry) model.getData().getValue(id)).value.value));
    return result;
  }
}
