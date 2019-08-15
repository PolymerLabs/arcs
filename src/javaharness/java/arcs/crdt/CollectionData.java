package arcs.crdt;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class CollectionData<T extends Referenceable> extends CRDTData {
  Map<String, VersionedValue<T>> values = new HashMap<>();

  public CollectionData() {
    version = VersionMap.of();
  }

  public VersionedValue<T> get(String id) {
    return values.get(id);
  }

  public T getValue(String id) {
    return values.get(id).value;
  }

  public int size() {
    return values.size();
  }

  public Collection<String> keys() {
    return values.keySet();
  }
}
