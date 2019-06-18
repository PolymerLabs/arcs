package arcs.api;

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
}
