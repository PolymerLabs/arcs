package arcs.api;

/** The configurations of Arcs runtime. */
public interface RuntimeSettings {
  // Used by Javascript-based and/or other types of Arcs runtime(s).
  // Equivalent to the &log=<level> parameter at JS Arcs runtime.
  int logLevel();

  // Controls whether JS Arcs Runtime should wait on the connection to the Arcs Explorer tool.
  // Equivalent to the &explore-proxy parameter at JS Arcs runtime.
  boolean enableArcsExplorer();

  // Controls whether to override loading of the particles and recipes to the Development Server,
  // which loads them from the developer's workstation.
  boolean loadAssetsFromWorkstation();

  // Value of the port to be used for connecting to the developer server.
  int devServerPort();

  // Used only by Javascript-based Arcs runtime to specify which shell
  // either on-device or on-host to connect with.
  String shellUrl();
}
