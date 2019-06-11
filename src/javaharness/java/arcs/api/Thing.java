package arcs.api;

import java.util.Optional;

public class Thing<T> {
    public final T thing;

    Thing(T thing) {
        this.thing = thing;
    }

    public T get() { return this.thing; }

    @Override
    public boolean equals(Object other) {
        return other instanceof Thing && get() == ((Thing)other).get();
    }

    @Override
    public int hashCode() {
        return get().hashCode();
    }

    public NativeParticle getParticle() {
        return this.thing instanceof NativeParticle ? Optional.of((NativeParticle)this.thing).orElse(null) : null;
    }

    public StorageProxy getStorageProxy() {
        return this.thing instanceof StorageProxy ? Optional.of((StorageProxy)this.thing).orElse(null) : null;
    }
}
