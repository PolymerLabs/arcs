package arcs.android.demo;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;
import android.widget.Button;

import arcs.android.ArcsService;

/**
 * Main class for the Bazel Android "Hello, World" app.
 */
public class MainActivity extends Activity {
  private static final String TAG = "Arcs";

  private final ServiceConnection connection =
      new ServiceConnection() {
        @Override
        public void onServiceConnected(
            ComponentName componentName, IBinder iBinder) {
          Log.d(TAG, "Connected to ArcsService.");
          connected = true;
          updateBtn();
        }

        @Override
        public void onServiceDisconnected(ComponentName componentName) {
          Log.d(TAG, "Disconnected to ArcsService.");
          connected = false;
          updateBtn();
        }
      };

  private Button toggleConnectionButton;

  private boolean connected;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    setContentView(R.layout.activity_main);

    toggleConnectionButton = findViewById(R.id.toggle_service_connection);
    toggleConnectionButton.setOnClickListener(v -> toggleConnection());

    Button autofillDemoButton = findViewById(R.id.autofill_demo_button);
    autofillDemoButton.setOnClickListener(v -> startAutofillDemo());

    Button notificationDemoButton = findViewById(R.id.notification_demo_button);
    notificationDemoButton.setOnClickListener(v -> startNotificationDemo());

    updateBtn();
  }

  private void toggleConnection() {
    Log.d(TAG, "toggleConnection");
    if (connected) {
      unbindService(connection);
      Log.d(TAG, "Disconnected to ArcsService.");
      connected = false;
      updateBtn();
    } else {
      Intent intent = new Intent(this, ArcsService.class);
      bindService(intent, connection, BIND_AUTO_CREATE);
    }
  }

  private void updateBtn() {
    Log.d(TAG, "updateBtn");
    toggleConnectionButton.setText(connected ? "Disconnect" : "Connect");
  }

  private void startAutofillDemo() {
    Intent intent = new Intent(this, AutofillDemoActivity.class);
    startActivity(intent);
  }

  private void startNotificationDemo() {
    Intent intent = new Intent(this, NotificationDemoActivity.class);
    startActivity(intent);
  }
}
