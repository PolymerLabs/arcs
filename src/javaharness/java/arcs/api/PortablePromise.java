package arcs.api;

import java.util.function.Consumer;

/** Portable representation of the Promise class. */
public interface PortablePromise<T> {
  public interface Resolver<T> extends Consumer<T> {
    default void resolve(T arg) {
      accept(arg);
    }
  }

  public interface Rejector<S> extends Consumer<S> {
    default void reject(S error) {
      accept(error);
    }
  }

  public interface PortablePromiseExecutor<T> {
    void doInvoke(Resolver<T> resolve, Rejector<?> reject);
  }

  PortablePromise<T> then(Consumer<T> onFulfillment);
}
