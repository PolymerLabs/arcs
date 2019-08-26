package arcs.crdt;

public class VersionedValue<T> {
  public final T value;
  public final VersionMap version;

  public VersionedValue(T value, VersionMap version) {
    this.value = value;
    this.version = version;
  }
}
