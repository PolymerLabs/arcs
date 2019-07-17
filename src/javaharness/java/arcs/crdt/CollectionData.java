package arcs.crdt;

import java.util.HashMap;
import java.util.Map;

public class CollectionData<T extends Referenceable> extends CRDTData {
   Map<String, VersionedValue<T>> values = new HashMap<>();
   VersionMap version = new VersionMap();
}
