package arcs.android.demo;

import static arcs.android.demo.NotificationRenderer.INTENT_EVENT_DATA_FIELD;
import static arcs.android.demo.NotificationRenderer.INTENT_REFERENCE_ID_FIELD;

import android.app.IntentService;
import android.content.Intent;
import android.util.Log;
import arcs.api.Arcs;
import arcs.api.PortableJsonParser;
import javax.inject.Inject;

public class AndroidNotificationHandlerService extends IntentService {

  private static final String TAG = "Arcs";

  @Inject
  Arcs arcs;

  @Inject
  PortableJsonParser jsonParser;

  public AndroidNotificationHandlerService() {
    super(AndroidNotificationHandlerService.class.getSimpleName());
  }

  @Override
  public void onCreate() {
    super.onCreate();

    Log.d(TAG, "onCreate()");

    DaggerAndroidNotificationHandlerServiceComponent.builder()
        .appContext(getApplicationContext())
        .build()
        .inject(this);

  }

  @Override
  public void onDestroy() {
    Log.d(TAG, "onDestroy()");
    super.onDestroy();
  }

  @Override
  public void onHandleIntent(Intent intent) {
    // TODO(mmandlis): refactor into an Arcs API method.
    String referenceId = intent.getStringExtra(INTENT_REFERENCE_ID_FIELD);
    String eventlet = intent.getStringExtra(INTENT_EVENT_DATA_FIELD);
    Log.d(TAG, "Received referenceId " + referenceId);
    arcs.sendMessageToArcs(
        jsonParser.stringify(
            jsonParser
                .emptyObject()
                .put(NotificationRenderer.MESSAGE_FIELD, NotificationRenderer.UI_EVENT_MESSAGE)
                .put(NotificationRenderer.PARTICLE_ID_FIELD, referenceId)
                .put(NotificationRenderer.EVENTLET_FIELD, jsonParser.parse(eventlet))));
  }
}
