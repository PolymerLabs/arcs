package arcs.webimpl;

import arcs.api.PortablePromise;
import arcs.api.PortablePromiseFactory;

import elemental2.promise.Promise;
import java.lang.Runnable;
import java.util.function.Consumer;
import javax.inject.Inject;

public class PortablePromiseFactoryImpl implements PortablePromiseFactory {
  @Inject
  public PortablePromiseFactoryImpl() {}

  @Override
  public <T> PortablePromise<T> newPromise(PortablePromise.PortablePromiseExecutor<T> executor) {
    return new PortablePromiseJsImpl(executor);
  }
}
