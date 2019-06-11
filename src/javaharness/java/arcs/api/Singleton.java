package arcs.api;

class Singleton extends Handle {
  public Singleton(StorageProxy storage, String name, boolean canRead, boolean canWrite) {
    super(storage, name, canRead, canWrite);
  }
}
