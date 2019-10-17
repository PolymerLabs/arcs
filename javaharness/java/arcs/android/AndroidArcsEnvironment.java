package arcs.android;

import javax.inject.Inject;
import javax.inject.Singleton;

import arcs.api.ArcsEnvironment;

/**
 * Web based ArcsEnvironment using ShellApi. The Android version of this will different only in not
 * needing to use the ShellApi + Web runtime.
 */
@Singleton
public class AndroidArcsEnvironment implements ArcsEnvironment {

  @Inject
  public AndroidArcsEnvironment() {}

  @Override
  public void init() {}

  @Override
  public void reset() {}

  @Override
  public void destroy() {}

  @Override
  public void show() {}

  @Override
  public void hide() {}
}
