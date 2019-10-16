package arcs.android.impl;

import javax.inject.Inject;

import arcs.api.ShellApi;

/** Exposes Shell (Window) scope methods into Java from JS. */
public final class AndroidShellApi implements ShellApi {

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
