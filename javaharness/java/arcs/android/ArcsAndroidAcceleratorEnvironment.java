package arcs.android;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import arcs.android.accelerator.AcceleratorPipesShell;
import arcs.api.ArcsMessageSender;
import arcs.api.PecPortManager;
import arcs.api.PortableJsonParser;
import arcs.api.RuntimeSettings;
import arcs.api.UiBroker;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import javax.inject.Inject;
import javax.inject.Provider;

class ArcsAndroidAcceleratorEnvironment implements AndroidArcsEnvironment {

  @Inject
  PortableJsonParser jsonParser;

  @Inject
  PecPortManager pecPortManager;

  @Inject
  UiBroker uiBroker;

  // Fetches the up-to-date properties on every get().
  @Inject
  Provider<RuntimeSettings> runtimeSettings;

  @Inject
  ArcsMessageSender arcsMessageSender;

  private final List<ReadyListener> readyListeners = new ArrayList<>();
  private final Handler uiThreadHandler = new Handler(Looper.getMainLooper());

  private Context context;
  private AcceleratorPipesShell acceleratorShell;

  @Inject
  public ArcsAndroidAcceleratorEnvironment() {
  }

  @Override
  public void addReadyListener(ReadyListener listener) {
    this.readyListeners.add(listener);
  }

  private void fireReadyEvent(List<String> recipes) {
    readyListeners.forEach(listener -> listener.onReady(recipes));
  }

  @Override
  public void init(Context context) {
    this.context = context;
    this.acceleratorShell = new AcceleratorPipesShell();
    arcsMessageSender.attachProxy(acceleratorShell::receive);
    fireReadyEvent(Collections.emptyList());
  }

  @Override
  public void destroy() {
  }
}
