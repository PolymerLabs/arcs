package arcs.api;

/** The configurations of Arcs runtime. */
public interface RuntimeSettings {
  // Used by Javascript-based and/or other types of Arcs runtime(s).
  // Equivalent to the &log=<level> parameter at JS Arcs runtime.
  default int logLevel() {
    return 0;
  }

  // Used mainly by Javascript-based Arcs runtime to establish WebSocket
  // connection to the host from the device during runtime initialization.
  // Equivalent to the &explore-proxy parameter at JS Arcs runtime.
  default boolean useDevServerProxy() {
    return false;
  }

  // Used only by Javascript-based Arcs runtime to specify which shell
  // either on-device or on-host to connect with.
  default String shellUrl() {
    return "";
  }
}
