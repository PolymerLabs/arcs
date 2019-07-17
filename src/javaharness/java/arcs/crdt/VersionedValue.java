package arcs.crdt;

public class VersionedValue<T> {
  T value;
  VersionMap version;
  VersionedValue(T value, VersionMap version) {
    this.value = value;
    this.version = version;
  }
}
