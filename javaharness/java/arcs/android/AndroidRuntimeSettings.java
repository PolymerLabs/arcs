package arcs.android;

import arcs.api.RuntimeSettings;
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
  private static final String USE_DEV_SERVER_PROXY_PROPERTY = "debug.arcs.runtime.use_alds";
  // The target shell to be loaded (on-device) or be connected (on-host)
  private static final String SHELL_URL_PROPERTY = "debug.arcs.runtime.shell_url";

  // Default settings:
  // Logs the most information, loads the on-device pipes-shell
  // and not uses ALDS proxy.
  private static final int DEFAULT_LOG_LEVEL = 2;
  private static final boolean DEFAULT_USE_DEV_SERVER = false;
  private static final String DEFAULT_SHELL_URL = "file:///android_asset/arcs/index.html?solo=dynamic.manifest&";
  private static final String LOCALHOST_SHELL_URL = "http://localhost:8786/shells/pipes-shell/web/deploy/dist/?";

  private static final Logger logger = Logger.getLogger(
      AndroidRuntimeSettings.class.getName());

  @AutoValue
  abstract static class Settings {
    abstract int logLevel();
    abstract boolean useDevServerProxy();
    abstract String shellUrl();

    static Builder builder() {
      return new AutoValue_AndroidRuntimeSettings_Settings.Builder();
    }

    @AutoValue.Builder
    abstract static class Builder {
      abstract Builder setLogLevel(int level);
      abstract Builder setUseDevServerProxy(boolean useDevServerProxy);
      abstract Builder setShellUrl(String shellUrl);
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
        .setUseDevServerProxy(
            getProperty(USE_DEV_SERVER_PROXY_PROPERTY, Boolean::valueOf, DEFAULT_USE_DEV_SERVER))
        .setShellUrl(
            getProperty(SHELL_URL_PROPERTY, String::valueOf, DEFAULT_SHELL_URL))
        .build();
  }

  @Override
  public int logLevel() {
    return settings.logLevel();
  }

  @Override
  public boolean useDevServerProxy() {
    return settings.useDevServerProxy();
  }

  @Override
  public String shellUrl() {
    return settings.shellUrl();
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
