package arcs.api;

public class Thing<T>  {
    public final T thing;

    Thing(T thing) {
        this.thing = thing;
    }

    public T get() { return this.thing; }
}
