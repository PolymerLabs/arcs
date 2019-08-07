package arcs.api;

class Singleton extends Handle {
  public Singleton(StorageProxy storage, IdGenerator idGenerator, String name,
      String particleId, boolean canRead, boolean canWrite) {
    super(storage, idGenerator, name, particleId, canRead, canWrite);
  }

  @Override
  public void notify(String kind, Particle particle, PortableJson details) {
    throw new AssertionError("Singleton::notify not implemented");
  }
}
