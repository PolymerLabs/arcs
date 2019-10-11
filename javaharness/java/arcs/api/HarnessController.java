package arcs.api;

public interface HarnessController {
  void init();
  default void deInit() {};
}
