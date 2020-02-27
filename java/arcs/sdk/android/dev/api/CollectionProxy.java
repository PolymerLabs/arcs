package arcs.sdk.android.dev.api;

import arcs.core.common.Referencable;
import arcs.core.crdt.CrdtSet;
import arcs.core.crdt.VersionMap;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;

class CollectionProxy extends StorageProxy implements CollectionStore {
  CrdtSet<ModelEntry> model;

  public CollectionProxy(
      String id,
      Type type,
      PecInnerPort port,
      String name,
      PortableJsonParser jsonParser) {
    super(id, type, port, name, jsonParser);
  }

  @Override
  public PortableJson getModelForSync() {
    return thisModelToList();
  }

  @Override
  public boolean synchronizeModel(Integer version, PortableJson model) {
    this.version = version;
    Map<String, CrdtSet.DataValue<ModelEntry>> values = new HashMap<>();
    for (int i = 0; i < model.getLength(); ++i) {
      ModelEntry entry = ModelEntry.fromJson(model.getObject(i));
      String key = entry.keys.iterator().next();
      //noinspection unchecked
      values.put(entry.getId(), new CrdtSet.DataValue<>(new VersionMap(key, version), entry));
    }
    //noinspection unchecked
    this.model = new CrdtSet<>(new CrdtSet.DataImpl<>(new VersionMap("", version), values));

    return true;
  }

  @Override
  public PortableJson processUpdate(PortableJson update, boolean apply) {
    if (syncState == SyncState.FULL) {
      // If we're synchronized, then any updates we sent have already been applied/notified.
      for (Map.Entry<Handle, Particle> observer : observers.entrySet()) {
        if (Objects.equals(update.getString("originatorId"), observer.getKey().particleId)) {
          return null;
        }
      }
    }
    PortableJson added = jsonParser.emptyArray();
    PortableJson removed = jsonParser.emptyArray();
    if (update.hasKey("add")) {
      for (int i = 0; i < update.getArray("add").getLength(); ++i) {
        PortableJson add = update.getArray("add").getObject(i);
        boolean effective = add.getBool("effective");
        PortableJson value = add.getObject("value");
        if ((apply
                && model.applyOperation(
                    createAddOperation(value, add.getArray(ModelEntry.KEYS).asStringArray())))
            || (!apply && effective)) {
          added.put(added.getLength(), value);
        }
      }
    } else if (update.hasKey("remove")) {
      for (int i = 0; i < update.getArray("remove").getLength(); ++i) {
        PortableJson remove = update.getArray("remove").getObject(i);
        CrdtSet.DataValue<ModelEntry> vv =
            model.getData().getValues().get(remove.getObject("value").getString("id"));
        ModelEntry entry = vv.getValue();
        String actor = remove.getObject(ModelEntry.KEYS).getString(0);
        boolean effective = remove.getBool("effective");
        if ((apply
                && model.applyOperation(
                    new CrdtSet.Operation.Remove<>(actor, vv.getVersionMap(), entry)))
            || (!apply && effective)) {
          removed.put(removed.getLength(), entry.value.value);
        }
      }
    } else {
      throw new AssertionError(
          "StorageProxy received invalid update event: " + jsonParser.stringify(update));
    }
    if (added.getLength() > 0 || removed.getLength() > 0) {
      PortableJson result =
          jsonParser.emptyObject().put("originatorId", update.getString("originatorId"));
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
  public CompletableFuture<PortableJson> get(String id) {
    if (syncState == SyncState.FULL) {
      return CompletableFuture.completedFuture(model.getData().getValues().get(id).getValue().value.value);
    } else {
      CompletableFuture<PortableJson> future = new CompletableFuture<>();
      port.handleToList(
          this,
          result -> {
            PortableJson entity = null;
            for (int i = 0; i < result.getLength(); ++i) {
            if (id.equals(result.getObject(i).getString("id"))) {
              entity = result.getObject(i);
              break;
            }
          }
          future.complete(entity);
      });
      return future;
    }
  }

  @Override
  public void store(PortableJson value, String[] keys, String particleId) {
    PortableJson data =
        jsonParser
            .emptyObject()
            .put("value", value)
            .put(ModelEntry.KEYS, jsonParser.fromStringArray(Arrays.asList(keys)));
    port.handleStore(this, new Consumer<PortableJson>() {
      @Override public void accept(PortableJson unused) {}
    }, data, particleId);

    if (syncState != SyncState.FULL) {
      return;
    }
    if (!model.applyOperation(createAddOperation(value, Arrays.asList(keys)))) {
      return;
    }
    PortableJson update =
        jsonParser
            .emptyObject()
            .put("originatorId", particleId)
            .put("add", jsonParser.emptyArray().put(0, value));
    notify("update", update, options -> options.notifyUpdate);
  }

  @Override
  public void clear(String particleId) {
    if (syncState != SyncState.FULL) {
      port.handleRemoveMultiple(this, (unused) -> {}, jsonParser.emptyArray(), particleId);
    }

    PortableJson items = jsonParser.emptyArray();
    for (String id : model.getData().getValues().keySet()) {
      PortableJson item = jsonParser.emptyObject().put("id", id);
      PortableJson keysJson = jsonParser.emptyArray();
      model.getData().getValues().keySet().forEach(key -> keysJson.put(keysJson.getLength(), key));
      item.put(ModelEntry.KEYS, keysJson);
      items.put(items.getLength(), item);
    }
    port.handleRemoveMultiple(this, (unused) -> {}, items, particleId);

    PortableJson removedItems = jsonParser.emptyArray();
    for (int i = 0; i < items.getLength(); ++i) {
      PortableJson item = items.getObject(i);
      CrdtSet.DataValue<ModelEntry> vv = model.getData().getValues().get(item.getString("id"));
      ModelEntry entry = vv.getValue();
      if (model.applyOperation(
          new CrdtSet.Operation.Remove<>(
              item.getObject("keys").getString(0),
              vv.getVersionMap(),
              entry))) {
        removedItems.put(
            removedItems.getLength(), item.put("rawData", entry.value.value.getObject("rawData")));
      }
    }

    if (removedItems.getLength() > 0) {
      notify(
          "update",
          jsonParser.emptyObject().put("originatorId", particleId).put("remove", removedItems),
          options -> options.notifyUpdate);
    }
  }

  @Override
  public void remove(String id, String[] keys, String particleId) {
    if (syncState != SyncState.FULL) {
      PortableJson data =
          jsonParser.emptyObject().put("id", id).put(ModelEntry.KEYS, jsonParser.emptyArray());
      port.handleRemove(this, (unused) -> {}, data, particleId);
      return;
    }

    CrdtSet.DataValue<ModelEntry> vv = model.getData().getValues().get(id);
    ModelEntry entry = vv.getValue();
    PortableJson value = entry.value.value;
    if (value == null) {
      return;
    }
    if (keys.length == 0) {
      keys = entry.keys.toArray(new String[0]);
    }
    PortableJson data =
        jsonParser
            .emptyObject()
            .put("id", id)
            .put(ModelEntry.KEYS, jsonParser.fromStringArray(Arrays.asList(keys)));
    port.handleRemove(this, (unused) -> {}, data, particleId);

    if (!model.applyOperation(
        new CrdtSet.Operation.Remove<>(/* actor = */ "", vv.getVersionMap(), entry))) {
      return;
    }
    PortableJson update =
        jsonParser
            .emptyObject()
            .put("originatorId", particleId)
            .put("remove", jsonParser.emptyArray().put(0, value));
    notify("update", update, options -> options.notifyUpdate);
  }

  @Override
  public CompletableFuture<PortableJson> toList() {
    if (syncState == SyncState.FULL) {
      return CompletableFuture.completedFuture(thisModelToList());
    } else {
      CompletableFuture<PortableJson> future = new CompletableFuture<>();
      port.handleToList(this, future::complete);
      return future;
    }
  }

  private CrdtSet.IOperation<ModelEntry> createAddOperation(
      PortableJson value, List<String> keys) {
    VersionMap modelVersion = model.getVersionMap();
    int itemVersion = modelVersion.get(keys.get(0)) + 1;
    //noinspection unchecked
    return new CrdtSet.Operation.Add<>(
        keys.get(0),
        new VersionMap(keys.get(0), itemVersion),
        new ModelEntry(value.getString("id"), value, keys));
  }

  private PortableJson thisModelToList() {
    PortableJson result = jsonParser.emptyArray();
    model
        .getData()
        .getValues()
        .keySet()
        .forEach(id -> result.put(result.getLength(), model.getData().getValues().get(id).getValue().value.value));
    return result;
  }

  static class ModelEntry implements Referencable {
    static final String KEYS = "keys";

    ModelValue value;
    Set<String> keys;

    ModelEntry(String id, PortableJson value, Collection<String> keys) {
      this.value = new ModelValue(id, value, null);
      this.keys = new HashSet<>(keys);
    }

    static ModelEntry fromJson(PortableJson json) {
      Set<String> keys = new HashSet<>();
      json.getObject(KEYS).forEach(keys::add);
      return new ModelEntry(json.getString("id"), json.getObject("value"), keys);
    }

    @Override
    public String getId() {
      return value.id;
    }

    @Override
    public Referencable unwrap() {
      return this;
    }


    @Override
    public long getExpirationTimestamp() {
      throw new AssertionError("ModelEntry::setExpiration not implemented");
    }

    @Override
    public void setExpirationTimestamp(long expirationTimestamp) {
      throw new AssertionError("ModelEntry::setExpiration not implemented");
    }
  }

  static class ModelValue {
    String id;
    PortableJson value;
    String storageKey;

    ModelValue(String id, PortableJson value, String storageKey) {
      this.id = id;
      this.value = value;
      this.storageKey = storageKey;
    }
  }
}
