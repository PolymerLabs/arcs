package arcs.android.demo;

import android.app.Activity;
import android.os.Bundle;

import javax.inject.Inject;

import arcs.api.Arcs;

/** Notification demo activity. */
public class NotificationDemoActivity extends Activity {

  @Inject Arcs arcs;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    ((ArcsDemoApplication) getApplication()).getComponent().inject(this);

    setContentView(R.layout.notification_demo);

    findViewById(R.id.send_notification_btn).setOnClickListener(v -> sendNotification());
  }

  private void sendNotification() {
    arcs.runArc("NotificationTest");
  }
}
