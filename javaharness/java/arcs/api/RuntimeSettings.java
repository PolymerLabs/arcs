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

  // Used only by Javascript-based Arcs runtime to create the dedicated
  // service worker thread (the Arcs Cache Manager) to match url requests to
  // the generated responses at the cache_storage. The generated responses on
  // js/wasm requests would trigger eager compilation rather than default lazy
  // compilation.
  //
  // Note:
  // This option only works when the runtime url is specified in "https"
  // protocol complying with the security origin policy.
  boolean useCacheManager();
}
