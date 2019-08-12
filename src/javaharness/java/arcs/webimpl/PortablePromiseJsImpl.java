package arcs.webimpl;

import arcs.api.PortablePromise;
import elemental2.promise.Promise;

import java.util.function.Consumer;

class PortablePromiseJsImpl<T> implements PortablePromise<T> {
  private Promise<T> promise;

  public PortablePromiseJsImpl(PortablePromise.PortablePromiseExecutor<T> executor) {
    this.promise =
        new Promise(
            (resolve, reject) -> {
              executor.doInvoke(
                  (T value) -> resolve.onInvoke(value), (Object error) -> reject.onInvoke(error));
            });
  }

  public PortablePromiseJsImpl(T value) {
    this.promise = Promise.resolve(value);
  }

  @Override
  public PortablePromise<T> then(Consumer<T> onFulfillment) {
    promise =
        promise.then((result) -> new Promise<>((resolve, reject) -> onFulfillment.accept(result)));
    return this;
  }
}
