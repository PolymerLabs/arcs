package arcs.impl;

import arcs.api.PortablePromise;
import arcs.api.PortablePromise.PortablePromiseExecutor;
import arcs.api.PortablePromiseFactory;
import javax.inject.Inject;

public class PortablePromiseFactoryAndroidImpl implements PortablePromiseFactory {

  @Inject
  public PortablePromiseFactoryAndroidImpl() {}

  @Override
  public <T> PortablePromise<T> newPromise(PortablePromiseExecutor<T> executor) {
    return new PortablePromiseAndroidImpl<>(executor);
  }

  @Override
  public <T> PortablePromise<T> newPromise(T value) {
    return new PortablePromiseAndroidImpl<>(value);
  }
}
