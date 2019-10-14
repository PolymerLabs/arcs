package arcs.android;

import android.util.Log;

import javax.inject.Inject;

import arcs.api.ShellApi;

public class AndroidShellApi implements ShellApi {

  Proxy proxy;

  @Inject
  AndroidShellApi() {}

  @Override
  public void sendMessageToArcs(String message) {
    Log.d("Arcs", "sendMessage to Arcs " + this + ", " + message);
    if (proxy != null) {
      Log.d("Arcs", "call proxy " + proxy);
      proxy.onMessage(message);
    } else {
      Log.d("Arcs", "proxy is null");
    }
  }

  @Override
  public void attachProxy(Proxy proxy) {
    this.proxy = proxy;
  }
}
