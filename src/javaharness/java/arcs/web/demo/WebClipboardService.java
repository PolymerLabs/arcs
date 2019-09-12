package arcs.web.demo;

import arcs.demo.services.ClipboardService;
import arcs.web.impl.WebHarnessController.DummyClipboard;
import java.util.function.Consumer;
import javax.inject.Inject;

public class WebClipboardService implements ClipboardService {

  private final DummyClipboard dummyClipboard;

  @Inject
  public WebClipboardService(DummyClipboard dummyClipboard) {
    this.dummyClipboard = dummyClipboard;
  }

  @Override
  public void listen(Consumer<String> pasted) {
    // TODO(cromwellian): implement
    dummyClipboard.onChange(str -> pasted.accept(str));
  }
}
