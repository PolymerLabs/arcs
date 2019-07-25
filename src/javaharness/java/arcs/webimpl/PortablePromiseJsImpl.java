package arcs.webimpl;

import arcs.api.PortablePromise;
import elemental2.promise.Promise;
import elemental2.promise.Promise.PromiseExecutorCallbackFn;
import elemental2.promise.IThenable.ThenOnFulfilledCallbackFn;
import elemental2.promise.IThenable;
import java.util.function.Consumer;


class PortablePromiseJsImpl<T> implements PortablePromise<T> {
  private final PortablePromise.PortablePromiseExecutor<T> executor;
  private Promise<T> promise;

  public PortablePromiseJsImpl(PortablePromise.PortablePromiseExecutor<T> executor) {
    this.promise = new Promise((resolve, reject) -> {
      executor.doInvoke((T value) -> resolve.onInvoke(value),
                        (Object error) -> reject.onInvoke(error));
    });
    this.executor = executor;
  }

  @Override
  public PortablePromise<T> then(Consumer<T> onFulfillment) {
    promise = promise.then((result) ->
        new Promise<>((resolve, reject) -> onFulfillment.accept(result)));
    return this;
  }
}
