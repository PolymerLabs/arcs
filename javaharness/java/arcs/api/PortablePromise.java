package arcs.api;

import java.util.function.Consumer;

/** Portable representation of the Promise class. */
public interface PortablePromise<T> {
  interface Resolver<T> extends Consumer<T> {
    default void resolve(T arg) {
      accept(arg);
    }
  }

  interface Rejector<S> extends Consumer<S> {
    default void reject(S error) {
      accept(error);
    }
  }

  interface PortablePromiseExecutor<T> {
    void doInvoke(Resolver<T> resolve, Rejector<?> reject);
  }

  PortablePromise<T> then(Consumer<T> onFulfillment);
}
