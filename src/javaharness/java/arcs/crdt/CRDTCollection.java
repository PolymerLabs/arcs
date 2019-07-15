package arcs.crdt;

import java.lang.Math;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

// Classes and interfaces copied from src/runtime/crdt/crdt-collection.ts
interface Referenceable {
  String getId();
}

class VersionedValue<T> {
  T value;
  VersionMap version;
  VersionedValue(T value, VersionMap version) {
    this.value = value;
    this.version = version;
  }
}

class CollectionData<T extends Referenceable> extends CRDTData {
   Map<String, VersionedValue<T>> values = new HashMap<>();
   VersionMap version = new VersionMap();
}

enum CollectionOpTypes { ADD, REMOVE }

class CollectionOperation<T> implements CRDTOperation {
  CollectionOpTypes type;
  Optional<T> added;
  Optional<T> removed;
  VersionMap clock;
  String actor;

  CollectionOperation(CollectionOpTypes type, T t, VersionMap clock, String actor) {
    this.type = type;
    switch (type) {
      case ADD:
        this.added = Optional.of(t);
        break;
      case REMOVE:
        this.removed = Optional.of(t);
        break;
      default:
        throw new AssertionError("Unsupported CollectionOpType " + type);
    }
    this.clock = clock;
    this.actor = actor;
  }
}

class RawCollection<T> extends HashSet<T> implements CRDTConsumerType {
  RawCollection() {}
  RawCollection(List<T> list) { super(list); }
}

class CRDTCollectionTypeRecord<T extends Referenceable> extends CRDTTypeRecord {
  CollectionData<T> data;
  CollectionOperation<T> operation;
  RawCollection<T> consumerType;
}

class CollectionChange<T extends Referenceable> extends CRDTChange<CRDTCollectionTypeRecord<T>> {}

interface CollectionModel<T extends Referenceable> extends CRDTModel<CRDTCollectionTypeRecord<T>> {}

public class CRDTCollection<T extends Referenceable> implements CollectionModel<T> {
  private CollectionData<T> model = new CollectionData<>();

  @Override
  public MergeResult merge(CRDTData other) {
    if (!(other instanceof CollectionData)) {
      throw new AssertionError("Cannot merge `other`");
    }
    CollectionData<T> otherModel = (CollectionData<T>) other;
    Map<String, VersionedValue<T>> newValues = mergeItems(model, otherModel);
    VersionMap newVersion = mergeVersions(model.version, otherModel.version);
    model.values = newValues;
    model.version = newVersion;
    // For now this is always returning a model change.
    CollectionChange<T> change = new CollectionChange<>();
    change.changeType = ChangeType.MODEL;
    change.modelPostChange = Optional.of(model);
    return new MergeResult(change, change);
  }

  @Override
  public boolean applyOperation(CRDTOperation op) {
    if (!(op instanceof CollectionOperation)) {
      throw new AssertionError("Incompatible operation " + op);
    }
    CollectionOperation<T> operation = (CollectionOperation) op;
    switch (operation.type) {
      case ADD:
        return add(operation.added.get(), operation.actor, operation.clock);
      case REMOVE:
        return remove(operation.removed.get(), operation.actor, operation.clock);
      default:
        throw new AssertionError("Op " + operation.type + " not supported");
    }
  }

  @Override
  public CollectionData<T> getData() { return model; }

  @Override
  public CRDTConsumerType getParticleView() {
    return new RawCollection(
        model.values.values().stream().map(v -> v.value).collect(Collectors.toList()));
  }

  private boolean add(T value, String key, VersionMap version) {
    // Only accept an add if it is immediately consecutive to the clock for that actor.
    int expectedClockValue = model.version.getOrDefault(key, 0).intValue() + 1;
    if (expectedClockValue != version.getOrDefault(key, 0)) {
      return false;
    }
    this.model.version.put(key, version.getOrDefault(key, 0));
    VersionMap previousVersion = model.values.containsKey(value.getId())
        ? model.values.get(value.getId()).version : new VersionMap();
    model.values.put(value.getId(), new VersionedValue(value, mergeVersions(version, previousVersion)));
    return true;
  }

  private boolean remove(T value, String key, VersionMap version) {
    if (!this.model.values.containsKey(value.getId())) {
      return false;
    }
    int clockValue = version.getOrDefault(key, 0).intValue();
    // Removes do not increment the clock.
    int expectedClockValue = model.version.getOrDefault(key, 0).intValue();
    if (expectedClockValue != clockValue) {
      return false;
    }
    // Cannot remove an element unless version is higher for all other actors as well.
    if (!dominates(version, model.values.get(value.getId()).version)) {
      return false;
    }
    model.version.put(key, clockValue);
    model.values.remove(value.getId());
    return true;
  }

  private Map<String, VersionedValue<T>> mergeItems(CollectionData<T> data1, CollectionData<T> data2) {
    Map<String, VersionedValue<T>> merged = new HashMap<>();
    for (VersionedValue<T> v2 : data2.values.values()) {
      if (model.values.containsKey(v2.value.getId())) {
        merged.put(v2.value.getId(), new VersionedValue(
            v2.value, mergeVersions(model.values.get(v2.value.getId()).version, v2.version)));
      } else if (!dominates(data1.version, v2.version)) {
        merged.put(v2.value.getId(), new VersionedValue(v2.value, v2.version));
      }
    }
    for (VersionedValue<T> v1 : data1.values.values()) {
      if (!data2.values.containsKey(v1.value.getId()) && !dominates(data2.version, v1.version)) {
        merged.put(v1.value.getId(), new VersionedValue(v1.value, v1.version));
      }
    }
    return merged;
  }

  private VersionMap mergeVersions(VersionMap version1, VersionMap version2) {
    VersionMap merged = new VersionMap();
    for (Map.Entry<String, Integer> entry : version1.entrySet()) {
      merged.put(entry.getKey(), entry.getValue());
    }
    for (Map.Entry<String, Integer> entry : version2.entrySet()) {
      Integer version1Value = version1.get(entry.getKey());
      merged.put(entry.getKey(), Math.max(entry.getValue().intValue(),
                                          version1Value == null ? 0 : version1Value.intValue()));
    }
    return merged;
  }

  private boolean dominates(VersionMap map1, VersionMap map2){
    for (Map.Entry<String, Integer> entry : map2.entrySet()) {
      if (map1.getOrDefault(entry.getKey(), 0).intValue() < entry.getValue()) {
        return false;
      }
    }
    return true;
  }
}
