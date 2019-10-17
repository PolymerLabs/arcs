package arcs.api;

import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class ArcsMessageSender {

  public interface Proxy {
    void sendMessage(String message);
  }

  Proxy proxy;

  @Inject
  ArcsMessageSender() {}

  public void sendMessageToArcs(String message) {
    if (proxy != null) {
      proxy.sendMessage(message);
    }
  }

  public void attachProxy(Proxy proxy) {
    this.proxy = proxy;
  }
}