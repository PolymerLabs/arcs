package arcs.android.demo;

import android.app.Activity;
import android.os.Bundle;

import java.util.Arrays;
import java.util.Collections;
import javax.inject.Inject;

import arcs.android.ArcsAndroidClient;

/** Notification demo activity. */
public class NotificationDemoActivity extends Activity {

  @Inject
  ArcsAndroidClient arcsAndroidClient;

  @Inject
  NotificationRenderer notificationRenderer;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    ((ArcsDemoApplication) getApplication()).getComponent().inject(this);

    arcsAndroidClient.connect(this);
    arcsAndroidClient.addManifests(
        Collections.singletonList(DemoConstants.ROOT_MANIFEST),
        success ->  {
          if (!success) {
            throw new IllegalStateException("Failed to add manifest");
          }
        });
    arcsAndroidClient.registerRenderer("notification", notificationRenderer);

    setContentView(R.layout.notification_demo);

    findViewById(R.id.send_notification_btn).setOnClickListener(v -> sendNotification());
  }

  @Override
  public void onDestroy() {
    arcsAndroidClient.disconnect(this);
    super.onDestroy();
  }

  private void sendNotification() {
    arcsAndroidClient.runArc("NotificationTest");
  }
}
