package arcs.api;

import java.util.function.Consumer;

public interface ClipboardService {
  void listen(Consumer<String> pasted);
}
