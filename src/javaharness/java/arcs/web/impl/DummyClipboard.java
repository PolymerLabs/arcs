package arcs.web.impl;

import arcs.demo.services.ClipboardService;
import java.util.function.Consumer;
import javax.inject.Inject;

public class DummyClipboard implements ClipboardService {
  private String text;
  private Consumer<String> pasted;

  @Inject
  public DummyClipboard() {}

  public void setText(String text) {
    this.text = text;
    if (pasted != null) {
        pasted.accept(text);
    }
  }
  @Override
  public void listen(Consumer<String> pasted) {
    this.pasted = pasted;
    if (text != null) {
      pasted.accept(text);
    }
  }
}