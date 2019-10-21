package arcs.android;

import android.content.Context;
import java.util.List;

interface AndroidArcsEnvironment {

  void addReadyListener(ReadyListener listener);
  void init(Context context);
  void destroy();

  interface ReadyListener {
    void onReady(List<String> recipes);
  }
}
