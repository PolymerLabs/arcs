package arcs.android.demo.ui;

import android.app.Activity;
import android.os.Bundle;

import arcs.api.Constants;
import javax.inject.Inject;

/** Notification demo activity. */
public class NotificationDemoActivity extends Activity {

  @Inject
  Constants constants;

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
    constants.runArc("NotificationTest");
  }
}
