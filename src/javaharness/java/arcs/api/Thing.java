package arcs.api;

import java.util.function.Consumer;

public class Thing<T> {
  public final T thing;

  Thing(T thing) {
    if (thing == null) {
      throw new AssertionError("Cannot create a null Thing");
    }
    this.thing = thing;
  }

  public T get() {
    return this.thing;
  }

  @Override
  public boolean equals(Object other) {
    return other instanceof Thing && get() == ((Thing) other).get();
  }

  @Override
  public int hashCode() {
    return get().hashCode();
  }

  public Particle getParticle() {
    if (!(thing instanceof Particle)) {
      throw new AssertionError("Thing is not a particle");
    }
    return (Particle) thing;
  }

  public StorageProxy getStorageProxy() {
    if (!(thing instanceof StorageProxy)) {
      throw new AssertionError("Thing is not a storage proxy");
    }
    return (StorageProxy) thing;
  }

  public Consumer<PortableJson> getConsumer() {
    if (!(thing instanceof Consumer)) {
      throw new AssertionError("Thing is not a consumer");
    }
    return (Consumer<PortableJson>) thing;
  }
}
