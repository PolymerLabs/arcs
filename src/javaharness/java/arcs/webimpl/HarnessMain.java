package arcs.webimpl;

import jsinterop.annotations.JsType;

@JsType
public class HarnessMain {
  public static void main(String[] args) {
    WebHarnessComponent component = DaggerWebHarnessComponent.create();
    component.getHarnessController().init();
  }
}
