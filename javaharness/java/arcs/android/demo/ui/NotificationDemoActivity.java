package arcs.android.demo.ui;

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

    DaggerNotificationDemoActivityComponent.builder()
        .appContext(getApplicationContext())
        .build()
        .inject(this);

    setContentView(R.layout.notification_demo);

    findViewById(R.id.send_notification_btn).setOnClickListener(v -> sendNotification());
  }

  private void sendNotification() {
    arcs.runArc("NotificationTest");
  }
}
