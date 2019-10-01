package arcs.crdt;

import java.util.HashSet;
import java.util.List;

public class RawCollection<T> extends HashSet<T> implements CRDTConsumerType {
  RawCollection() {}

  RawCollection(List<T> list) {
    super(list);
  }
}
