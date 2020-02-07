package arcs.sdk.android.dev.api;

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

  // Used only by Javascript-based Arcs runtime to specify system tracing channel.
  // Available options:
  //   'android': trace messages are bridged to the Android Trace APIs
  //   'console': trace messages are bridged to JS console
  // Options not listed above would be skipped, namely trace messages are
  // neither generated nor bridged.
  String systemTraceChannel();

  // Used only by Javascript-based Arcs runtime to create a worker pool which
  // spins up workers ahead of time and also supports to suspend workers then
  // resumes later (aka resurrecting workers) to prevent spin-up overhead.
  boolean useWorkerPool();

  // Used together with the setting {@link #useWorkerPool()} to supply additional
  // worker pool configurations. Options are separated by commas.
  // Available options:
  //   'nosuspend': only create new workers ahead of time (no resurrecting workers).
  //                A resurrected or resumed worker exposes the same global context
  //                to all Arcs that were and is running on it. Which implies new
  //                Arcs can potentially eavesdrop older Arcs' information as a
  //                side-channel attack if old Arcs forgot to clean what they stored
  //                at the worker's global context.
  //
  String workerPoolOptions();

  // Used only by Javascript-based Arcs runtime to determine and adjust size of
  // worker pool dynamically. The option is effective when {@link #useWorkerPool()}
  // is enabled.
  // Available policies:
  //   'conservative': keep as small-and-constant pool size as possible
  //   'aggressive': maintain bigger spare room, eager to fulfill worker demands
  //                 anytime if possible
  //   'predictive': foresee worker demands in accordance of current demand and
  //                 historical stats
  //   'default': the default policy auto-selected by Arcs runtime which is
  //              'conservative'.
  // If none or an unknown policy is specified, go with 'default'.
  String sizingPolicy();
}
