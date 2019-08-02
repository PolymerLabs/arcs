package arcs.api;

class Singleton extends Handle {
  public Singleton(StorageProxy storage, String name, boolean canRead, boolean canWrite) {
    super(storage, name, canRead, canWrite);
  }

  @Override
  public void notify(String kind, Particle particle, PortableJson details) {
    throw new AssertionError("Singleton::notify not implemented");
  }
}
