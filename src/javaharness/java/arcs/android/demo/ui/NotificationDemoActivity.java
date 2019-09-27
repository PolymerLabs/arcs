package arcs.android.demo.ui;

import android.app.Activity;
import android.os.Bundle;

import javax.inject.Inject;

import arcs.android.api.IRemotePecCallback;
import arcs.android.client.ArcsServiceBridge;
import arcs.api.Id;

/** Notification demo activity. */
public class NotificationDemoActivity extends Activity {

  @Inject
  ArcsServiceBridge bridge;

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
    bridge.startArc(Id.newArcId().toString(), null, "NotificationTest", null, null, null,
        new IRemotePecCallback.Stub() {
          @Override
          public void onMessage(String message) {}
        });
  }
}
