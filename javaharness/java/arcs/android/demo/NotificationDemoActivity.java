package arcs.android.demo;

import android.app.Activity;
import android.os.Bundle;

import javax.inject.Inject;

import arcs.api.Arcs;
import arcs.api.UiBroker;

/** Notification demo activity. */
public class NotificationDemoActivity extends Activity {

  @Inject
  Arcs arcs;

  @Inject
  NotificationRenderer notificationRenderer;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    ((ArcsDemoApplication) getApplication()).getComponent().inject(this);

    arcs.registerRenderer("notification", notificationRenderer);

    setContentView(R.layout.notification_demo);

    findViewById(R.id.send_notification_btn).setOnClickListener(v -> sendNotification());
  }

  private void sendNotification() {
    arcs.runArc("NotificationTest");
  }
}
