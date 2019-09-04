package arcs.web.demo;

import jsinterop.annotations.JsType;

@JsType
public class HarnessMain {
  public static void main(String[] args) {
    DemoComponent component = DaggerDemoComponent.create();
    component.getHarnessController().init();
  }
}
