package arcs.android.client;

import android.content.ServiceConnection;

/**
 * Starts up the {@link arcs.android.api.IArcsService} in the client app. A concrete implementation
 * must be provided by the app which implements the {@code IArcsService}.
 */
public interface ArcsServiceStarter {
  void start(ServiceConnection connection);
}
