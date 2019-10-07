package arcs.demo.services;

import java.util.function.Consumer;

public interface ClipboardService {
  void listen(Consumer<String> pasted);
}
