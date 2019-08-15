package arcs.webimpl;

import arcs.api.ShellApi;
import javax.inject.Inject;
import jsinterop.annotations.JsType;

/** Exposes Shell (Window) scope methods into Java from JS. */
public class ShellApiImpl implements ShellApi {

  @Inject
  public ShellApiImpl() {}

  @JsType(isNative = true, namespace = "<window>", name = "ShellApi")
  private static class NativeShellApi {
    public static native String receive(String json);
  }

  @Override
  public String receive(String json) {
    return NativeShellApi.receive(json);
  }
}
