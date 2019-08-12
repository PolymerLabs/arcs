package arcs.webimpl;

import arcs.api.PortablePromise;
import arcs.api.PortablePromiseFactory;

import javax.inject.Inject;

public class PortablePromiseFactoryImpl implements PortablePromiseFactory {
  @Inject
  public PortablePromiseFactoryImpl() {}

  @Override
  public <T> PortablePromise<T> newPromise(PortablePromise.PortablePromiseExecutor<T> executor) {
    return new PortablePromiseJsImpl(executor);
  }

  @Override
  public <T> PortablePromise<T> newPromise(T value) {
    return new PortablePromiseJsImpl(value);
  }
}
