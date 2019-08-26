package arcs.api;

import java.util.function.Consumer;

public interface ClipboardSurface {
  void listen(Consumer<String> pasted);
}
