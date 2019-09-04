package arcs.android.impl;

import arcs.api.PortablePromise;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.Consumer;

public class PortablePromiseAndroidImpl<T> implements PortablePromise<T> {

  private CompletableFuture<T> future;

  public PortablePromiseAndroidImpl(PortablePromise.PortablePromiseExecutor<T> executor) {
    this.future = new CompletableFuture<>();
    // TODO(cromwellian): make this injectable policy
    Future<?> unused = Executors.newSingleThreadExecutor()
        .submit(
            () -> {
              executor.doInvoke(
                  (T value) -> future.complete(value),
                  (Object error) -> future.completeExceptionally((Throwable) error));
            });
  }

  public PortablePromiseAndroidImpl(T value) {
    this.future = CompletableFuture.completedFuture(value);
  }

  @Override
  public PortablePromise<T> then(Consumer<T> onFulfillment) {
    Future<?> unused = future.thenAccept(onFulfillment);
    return this;
  }
}
