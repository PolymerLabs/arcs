package arcs.android.demo;

import android.app.IntentService;
import android.content.Intent;
import android.util.Log;
import arcs.android.ArcsAndroidClient;
import arcs.api.Constants;
import arcs.api.PortableJsonParser;
import javax.inject.Inject;

public class AndroidNotificationHandlerService extends IntentService {

  private static final String TAG = "Arcs";

  @Inject
  ArcsAndroidClient arcsAndroidClient;

  @Inject
  PortableJsonParser jsonParser;

  public AndroidNotificationHandlerService() {
    super(AndroidNotificationHandlerService.class.getSimpleName());
  }

  @Override
  public void onCreate() {
    super.onCreate();

    ((ArcsDemoApplication) getApplication()).getComponent().inject(this);

    arcsAndroidClient.connect(this);
  }

  @Override
  public void onDestroy() {
    arcsAndroidClient.disconnect(this);

    super.onDestroy();
  }

  @Override
  public void onHandleIntent(Intent intent) {
    Log.d("Arcs", "onHandleIntent");
    // TODO(mmandlis): refactor into an Arcs API method.
    String referenceId = intent.getStringExtra(Constants.INTENT_REFERENCE_ID_FIELD);
    String eventlet = intent.getStringExtra(Constants.INTENT_EVENT_DATA_FIELD);
    Log.d(TAG, "Received referenceId " + referenceId);
    arcsAndroidClient.sendMessageToArcs(
        jsonParser.stringify(
            jsonParser
                .emptyObject()
                .put(Constants.MESSAGE_FIELD, Constants.UI_EVENT_MESSAGE)
                .put(Constants.UI_PARTICLE_ID_FIELD, referenceId)
                .put(Constants.EVENTLET_FIELD, jsonParser.parse(eventlet))));
  }
}
