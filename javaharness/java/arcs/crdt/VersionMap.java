package arcs.crdt;

import java.util.HashMap;
import java.util.Map;

public class VersionMap extends HashMap<String, Integer> {
  public VersionMap(Map<? extends String, ? extends Integer> map) {
    super(map);
  }

  public VersionMap() {
    super();
  }

  public static VersionMap of() {
    return new VersionMap();
  }

  public static VersionMap of(String k, int v) {
    VersionMap vm = of();
    vm.put(k, v);
    return vm;
  }

  public static VersionMap of(String k, int v, String k2, int v2) {
    VersionMap vm = of(k, v);
    vm.put(k2, v2);
    return vm;
  }
}
