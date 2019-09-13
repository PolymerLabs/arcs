package arcs.api;

import java.util.Map;
import java.util.logging.Logger;
import javax.inject.Inject;

/**
 * Web based ArcsEnvironment using ShellApi. The Android version of this will different only in not
 * needing to use the ShellApi + Web runtime.
 */
public class ShellApiBasedArcsEnvironment implements ArcsEnvironment {

  private static final Logger logger = Logger.getLogger(ShellApiBasedArcsEnvironment.class.getName());

  private final Map<String, DataListener> inProgress;
  private ShellApi shellApi;

  @Inject
  public ShellApiBasedArcsEnvironment(Map<String, DataListener> inProgress, ShellApi shellApi) {
    this.inProgress = inProgress;
    this.shellApi = shellApi;
  }

  @Override
  public void sendMessageToArcs(String msg, DataListener listener) {
    String transactionId = String.valueOf(shellApi.receive(msg));
    if (listener != null) {
      logger.warning("Deprecated use of `listener` in msg: " + msg);
      inProgress.put(transactionId, listener);
    }
  }

  @Override
  public void addReadyListener(ReadyListener listener) {}

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
