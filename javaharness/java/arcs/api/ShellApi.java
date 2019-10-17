package arcs.api;

import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class ShellApi {

  public interface Proxy {
    void onMessage(String message);
  }

  Proxy proxy;

  @Inject
  ShellApi() {}

  public void sendMessageToArcs(String message) {
    if (proxy != null) {
      proxy.onMessage(message);
    }
  }

  public void attachProxy(Proxy proxy) {
    this.proxy = proxy;
  }
}