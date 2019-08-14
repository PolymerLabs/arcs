package arcs.api;

/** Portable Promise factory that works on either JS or Android environment. */
public interface PortablePromiseFactory {
  <T> PortablePromise<T> newPromise(PortablePromise.PortablePromiseExecutor<T> executor);

  <T> PortablePromise<T> newPromise(T value);
}
