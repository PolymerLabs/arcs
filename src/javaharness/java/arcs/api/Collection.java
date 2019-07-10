package arcs.api;

class Collection extends Handle {
  public Collection(StorageProxy storage, String name, boolean canRead, boolean canWrite) {
    super(storage, name, canRead, canWrite);
  }

  @Override
  public void notify(String kind, NativeParticle particle, PortableJson details) {
    switch (kind) {
      case "sync":
        // TODO: handle details properly (see handle.ts)
        particle.onHandleSync(this, details);
        break;
      case "update":
        // TODO: handle details properly (see handle.ts)
        particle.onHandleUpdate(this, details);
        break;
      default:
        throw new AssertionError("Unsupported notify kind " + kind + " for particle: " + particle.getName());
    }
  }
}
