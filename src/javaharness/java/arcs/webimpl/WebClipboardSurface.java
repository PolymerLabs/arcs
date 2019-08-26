package arcs.webimpl;

import arcs.api.ClipboardSurface;
import java.util.function.Consumer;
import javax.inject.Inject;

public class WebClipboardSurface implements ClipboardSurface {

  @Inject
  public WebClipboardSurface() {
  }

  @Override
  public void listen(Consumer<String> pasted) {
    // TODO(cromwellian): implement
  }
}
