package arcs.android.demo;

import android.app.Activity;
import android.os.Bundle;

import javax.inject.Inject;

import arcs.android.AndroidArcsClient;

/** Notification demo activity. */
public class NotificationDemoActivity extends Activity {

  @Inject
  AndroidArcsClient arcsClient;

  @Inject
  NotificationRenderer notificationRenderer;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    ((ArcsDemoApplication) getApplication()).getComponent().inject(this);

    arcsClient.connect(this);
    arcsClient.registerRenderer("notification", notificationRenderer);

    setContentView(R.layout.notification_demo);

    findViewById(R.id.send_notification_btn).setOnClickListener(v -> sendNotification());
  }

  @Override
  public void onDestroy() {
    arcsClient.disconnect(this);
    super.onDestroy();
  }

  private void sendNotification() {
    arcsClient.runArc("NotificationTest");
  }
}
