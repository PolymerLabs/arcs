package arcs.android;

import javax.inject.Inject;

import arcs.api.ShellApi;

final class AndroidShellApi implements ShellApi {

  Proxy proxy;

  @Inject
  AndroidShellApi() {}

  @Override
  public void sendMessageToArcs(String message) {
    if (proxy != null) {
      proxy.onMessage(message);
    }
  }

  @Override
  public void attachProxy(Proxy proxy) {
    this.proxy = proxy;
  }
}
