package arcs.api;

class Collection extends Handle {
  public Collection(StorageProxy storage, String name, boolean canRead, boolean canWrite) {
    super(storage, name, canRead, canWrite);
  }
}
