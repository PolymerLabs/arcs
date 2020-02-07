package arcs.sdk.android.dev.service;

import arcs.sdk.android.dev.api.RuntimeSettings;
import com.google.auto.value.AutoValue;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Optional;
import java.util.function.Function;
import java.util.logging.Logger;
import javax.inject.Inject;

/** For Javascript-based Arcs runtime. */
public final class AndroidRuntimeSettings implements RuntimeSettings {
  // Equivalent to &log parameter
  private static final String LOG_LEVEL_PROPERTY = "debug.arcs.runtime.log";
  // Equivalent to &explore-proxy parameter
  private static final String ENABLE_ARCS_EXPLORER_PROPERTY =
      "debug.arcs.runtime.enable_arcs_explorer";
  // The target shell to be loaded (on-device) or be connected (on-host)
  private static final String SHELL_URL_PROPERTY = "debug.arcs.runtime.shell_url";
  // Whether to load particles and recipes from the workstation
  private static final String LOAD_ASSETS_FROM_WORKSTATION_PROPERTY =
      "debug.arcs.runtime.load_workstation_assets";
  // Port to be used for the communication with the dev server.
  private static final String DEV_SERVER_PORT_PROPERTY = "debug.arcs.runtime.dev_server_port";
  // Equivalent to &use-cache parameter
  private static final String USE_CACHE_MANAGER_PROPERTY = "debug.arcs.runtime.use_cache_mgr";
  // Equivalent to &systrace parameter
  private static final String SYSTEM_TRACE_CHANNEL_PROPERTY = "debug.arcs.runtime.systrace";
  // Whether to use worker pool to expedite Arcs execution.
  private static final String USE_WORKER_POOL_PROPERTY = "debug.arcs.runtime.use_worker_pool";
  // Supplies additional worker pool configurations.
  // Sees {@link RuntimeSettings#workerPoolOptions()} for all available options.
  private static final String WORKER_POOL_OPTIONS_PROPERTY =
      "debug.arcs.runtime.worker_pool_options";
  // Guides how to shrink or grow worker pool dynamically.
  // Sees {@link RuntimeSettings#sizingPolicy()} for all available policies and
  // the default policy.
  private static final String SIZING_POLICY_PROPERTY = "debug.arcs.runtime.sizing_policy";

  // Default settings:
  // Logs the most information
  private static final int DEFAULT_LOG_LEVEL = 2;
  // Does *not* connect Arcs Explorer
  private static final boolean DEFAULT_ENABLE_ARCS_EXPLORER = false;
  // Loads the on-device pipes-shell
  // Multiple protocols are supported, i.e.
  // file:///android_asset/arcs/index.html?
  // https://appassets.androidplatform.net/assets/arcs/index.html?
  // The Arcs Cache Manager only works at https secure origin.
  private static final String DEFAULT_SHELL_URL =
      "https://appassets.androidplatform.net/assets/arcs/index.html?";
  // Load the on-device assets
  private static final boolean DEFAULT_ASSETS_FROM_WORKSTATION = false;
  // Uses the standard 8786 port
  private static final int DEFAULT_DEV_SERVER_PORT = 8786;
  // Activates the Arcs Cache Manager.
  private static final boolean DEFAULT_USE_CACHE_MANAGER = true;
  // Disables system trace
  private static final String DEFAULT_SYSTEM_TRACE_CHANNEL = "";
  // Activates worker pool
  private static final boolean DEFAULT_USE_WORKER_POOL = true;
  // "nosuspend" prepares or replenishes new workers ahead of time but never
  // re-uses (suspend-then-resume) them.
  private static final String DEFAULT_WORKER_POOL_OPTIONS = "nosuspend";
  // Uses the default sizing policy auto-selected by Arcs runtime
  private static final String DEFAULT_SIZING_POLICY = "default";

  private static final Logger logger = Logger.getLogger(
      AndroidRuntimeSettings.class.getName());

  @AutoValue
  abstract static class Settings {
    abstract int logLevel();
    abstract boolean enableArcsExplorer();
    abstract String shellUrl();
    abstract boolean loadAssetsFromWorkstation();
    abstract int devServerPort();
    abstract boolean useCacheManager();
    abstract String systemTraceChannel();
    abstract boolean useWorkerPool();
    abstract String workerPoolOptions();
    abstract String sizingPolicy();

    static Builder builder() {
      return new AutoValue_AndroidRuntimeSettings_Settings.Builder();
    }

    @AutoValue.Builder
    abstract static class Builder {
      abstract Builder setLogLevel(int level);
      abstract Builder setEnableArcsExplorer(boolean useDevServerProxy);
      abstract Builder setShellUrl(String shellUrl);
      abstract Builder setLoadAssetsFromWorkstation(boolean loadAssetsFromWorkstation);
      abstract Builder setDevServerPort(int devServerPort);
      abstract Builder setUseCacheManager(boolean useCacheManager);
      abstract Builder setSystemTraceChannel(String systemTraceChannel);
      abstract Builder setUseWorkerPool(boolean useWorkerPool);
      abstract Builder setWorkerPoolOptions(String workerPoolOptions);
      abstract Builder setSizingPolicy(String sizingPolicy);
      abstract Settings build();
    }
  }

  // Immutable configurations for this runtime settings instance.
  private final Settings settings;

  @Inject
  public AndroidRuntimeSettings() {
    settings = Settings.builder()
        .setLogLevel(
            getProperty(LOG_LEVEL_PROPERTY, Integer::valueOf, DEFAULT_LOG_LEVEL))
        .setEnableArcsExplorer(
            getProperty(
                ENABLE_ARCS_EXPLORER_PROPERTY,
                Boolean::valueOf,
                DEFAULT_ENABLE_ARCS_EXPLORER))
        .setShellUrl(
            getProperty(SHELL_URL_PROPERTY, String::valueOf, DEFAULT_SHELL_URL))
        .setLoadAssetsFromWorkstation(
            getProperty(LOAD_ASSETS_FROM_WORKSTATION_PROPERTY, Boolean::valueOf,
                DEFAULT_ASSETS_FROM_WORKSTATION))
        .setDevServerPort(
            getProperty(DEV_SERVER_PORT_PROPERTY, Integer::valueOf, DEFAULT_DEV_SERVER_PORT))
        .setUseCacheManager(
            getProperty(USE_CACHE_MANAGER_PROPERTY, Boolean::valueOf, DEFAULT_USE_CACHE_MANAGER))
        .setSystemTraceChannel(
            getProperty(
                SYSTEM_TRACE_CHANNEL_PROPERTY,
                String::valueOf,
                DEFAULT_SYSTEM_TRACE_CHANNEL))
        .setUseWorkerPool(
            getProperty(USE_WORKER_POOL_PROPERTY, Boolean::valueOf, DEFAULT_USE_WORKER_POOL))
        .setWorkerPoolOptions(
            getProperty(
                WORKER_POOL_OPTIONS_PROPERTY,
                String::valueOf,
                DEFAULT_WORKER_POOL_OPTIONS))
        .setSizingPolicy(
            getProperty(SIZING_POLICY_PROPERTY, String::valueOf, DEFAULT_SIZING_POLICY))
        .build();
  }

  @Override
  public int logLevel() {
    return settings.logLevel();
  }

  @Override
  public boolean enableArcsExplorer() {
    return settings.enableArcsExplorer();
  }

  @Override
  public String shellUrl() {
    return settings.shellUrl();
  }

  @Override
  public boolean loadAssetsFromWorkstation() {
    return settings.loadAssetsFromWorkstation();
  }

  @Override
  public int devServerPort() {
    return settings.devServerPort();
  }

  @Override
  public boolean useCacheManager() {
    return settings.useCacheManager();
  }

  @Override
  public String systemTraceChannel() {
    return settings.systemTraceChannel();
  }

  @Override
  public boolean useWorkerPool() {
    return settings.useWorkerPool();
  }

  @Override
  public String workerPoolOptions() {
    return settings.workerPoolOptions();
  }

  @Override
  public String sizingPolicy() {
    return settings.sizingPolicy();
  }

  /**
   * This API reads the specified <var>property</var>, converts the content to
   * the type of <var>T</var> via the <var>converter</var>, then returns the
   * result.
   *
   * If the result cannot be resolved i.e. thrown exception, the <var>defaultValue</var>
   * is returned instead.
   *
   * @param property Android property name to read.
   * @param converter Converts the type of property content from String to T.
   * @param defaultValue The returned data when either the property does not exist
   *                     or it's in ill format.
   * @param <T> The expected type of returned data.
   * @return the resolved content of property in type T.
   */
  @SuppressWarnings("RuntimeExec")
  private <T> T getProperty(String property, Function<String, T> converter, T defaultValue) {
    try {
      // Property-read is granted at the public domain of selinux policies.
      Process process = Runtime.getRuntime().exec("getprop " + property);
      BufferedReader input = new BufferedReader(new InputStreamReader(process.getInputStream()));
      Optional<String> propertyValue = Optional.ofNullable(input.readLine());
      input.close();
      // The specified property does not exist.
      if (propertyValue.isPresent() && propertyValue.get().isEmpty()) {
        propertyValue = Optional.ofNullable(null);
      }
      return propertyValue.map(converter).orElse(defaultValue);
    } catch (Exception e) {
      logger.warning("illegal value of " + property);
    }
    return defaultValue;
  }
}
