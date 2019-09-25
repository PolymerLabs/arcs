package arcs.android.demo;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.logging.Logger;

/**
 * Main class for the Bazel Android "Hello, World" app.
 */
public class MainActivity extends Activity {
  /**
   * Indicates whether to use static assets compiled into the apk, or use devserver on the host's
   * localhost (which is on IP 10.0.2.2).
   *
   * Start the Arcs dev server (ALDS) via "./tools/sigh devServer"
   */
  // TODO: Pass this value in from Bazel somehow (can I use a flag?). Or use a toggle switch.
  private static final boolean USE_DEVSERVER = false;

  private static final String SHELL_JS_URL =
          USE_DEVSERVER
                  ? "http://10.0.2.2:8786/shells/pipes-shell/web/index.html?log"
                  : "file:///android_asset/pipes_shell_dist/index.html?log";

  private static final String SHELL_SURFACE_URL =
          USE_DEVSERVER
                  ? "http://10.0.2.2:8786/shells/pipes-shell/surface/surface.html"
                  : "file:///android_asset/pipes_surface_dist/surface.html";

  private static final Logger logger = Logger.getLogger(MainActivity.class.getName());
  private static final String CHANNEL_ID = "arcs_channel_id";
  private static final String ACTION_HANDLE_NOTIFICATION = "action_handle_notification";
  private static final String EXTRA_NOTIFICATION_SHELL_COMMAND = "extra_notification_shell_command";
  private static final String EXTRA_NOTIFICATION_SPAWN_RECIPE = "extra_notification_spawn_recipe";

  private WebView shellWebView;
  private WebView renderingWebView;
  private NotificationManager notificationManager;
  private int notificationId = 0;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    notificationManager =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

    NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Arcs notifications",
            NotificationManager.IMPORTANCE_DEFAULT);
    notificationManager.createNotificationChannel(channel);

    TextView refreshButton = new TextView(this);
    refreshButton.setText("Refresh");
    refreshButton.setOnClickListener(v -> {
      shellWebView.reload();
      renderingWebView.reload();
    });

    shellWebView = new WebView(this);
    shellWebView.setVisibility(View.GONE);
    setWebviewSettings(shellWebView.getSettings());
    shellWebView.addJavascriptInterface(this, "Android");
    shellWebView.loadUrl(SHELL_JS_URL);

    renderingWebView = new WebView(this);
    setWebviewSettings(renderingWebView.getSettings());
    renderingWebView.addJavascriptInterface(this, "Android");
    renderingWebView.loadUrl(SHELL_SURFACE_URL);

    WebView.setWebContentsDebuggingEnabled(true);

    LinearLayout layout = new LinearLayout(this);
    layout.setOrientation(LinearLayout.VERTICAL);
    layout.addView(refreshButton);
    layout.addView(shellWebView);
    layout.addView(renderingWebView);
    setContentView(layout);
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    if (intent.getAction() == null) {
      return;
    } else if (intent.getAction().equals(ACTION_HANDLE_NOTIFICATION)) {
      String recipeToSpawn = intent.getStringExtra(EXTRA_NOTIFICATION_SPAWN_RECIPE);
      if (recipeToSpawn != null) {
        spawn(recipeToSpawn);
      } else {
        handleNotificationTapShellCommand(intent.getStringExtra(EXTRA_NOTIFICATION_SHELL_COMMAND));
      }
    }
  }

  private void handleNotificationTapShellCommand(String payload) {
    //showToast("Notification tapped!");
    logger.info("Payload stored in notification: [" + payload + "]");
    sendToShell(payload);
  }

  @SuppressLint("SetJavaScriptEnabled")
  private void setWebviewSettings(WebSettings settings) {
    settings.setDatabaseEnabled(true);
    settings.setGeolocationEnabled(true);
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setSafeBrowsingEnabled(false);
    settings.setAllowFileAccessFromFileURLs(true);
    settings.setAllowUniversalAccessFromFileURLs(true);
  }

  @JavascriptInterface
  public void sendToShell(String message) {
    logger.info("Sending to JS: " + message);
    shellWebView.post(() -> shellWebView.evaluateJavascript(String.format("window.ShellApi.receive(%s);", message), null));
  }

  private void render(JSONObject obj, int tid) {
    logger.info("Sending something to renderer.");
    renderingWebView.post(() -> {
      renderingWebView.evaluateJavascript(String.format("window.renderer.dispatch = (pid, eventlet) => Android.sendToShell(JSON.stringify({message: 'event', tid: %s, pid, eventlet}));", tid), null);
      renderingWebView.evaluateJavascript(String.format("window.renderer.render(%s);", obj.toString()), null);
    });
  }

  private int spawn(String recipe) {
    /*return*/ sendToShell("{\"message\": \"spawn\", \"recipe\": \"" + recipe + "\"}");
    return 0;
  }

    @JavascriptInterface
  public void receive(String json) throws JSONException {
    JSONObject obj = new JSONObject(json);
    String message = obj.getString("message");
    logger.info("Java received message: " + message);
    switch (message) {
      case "ready":
        spawn("Notification");
        spawn("CatOfTheDay");
        break;
      case "slot":
        int tid = obj.getInt("tid");
        JSONObject content = obj.optJSONObject("content");
        if (content != null) {
          JSONObject model = content.optJSONObject("model");
          if (model != null) {
            processSlot(tid, content, model);
          }
        }
        break;
      default:
        logger.info("Got unhandled message of type: " + message);
        break;
    }
  }

  /** Handles different slot modalities. */
  private void processSlot(int tid, JSONObject content, JSONObject model) throws JSONException {
    String modality = model.optString("modality", "xen");
    switch (modality) {
      case "xen":
        render(content, tid);
        break;

      case "notification":
        String shellCommandPayload = "";
        String recipeToSpawn = null;
        JSONObject particle = content.optJSONObject("particle");
        if (particle != null) {
          if (model.has("onclick")) {
            // Construct a shell command payload.
            String pid = particle.optString("id", "");
            String handler = model.optString("onclick", "");
            String value = model.optString("text", "");
            shellCommandPayload = "{"
                    + "\"message\": \"event\", "
                    + "\"tid\": \"" + Integer.toString(tid) + "\", "
                    + "\"pid\": \"" + pid + "\", "
                    + "\"eventlet\": {"
                    + "\"handler\": \"" + handler + "\", "
                    + "\"data\": {"
                    + "\"value\": \"" + value + "\""
                    + "}"
                    + "}"
                    + "}";
            logger.info("Shell command payload constructed: [" + shellCommandPayload + "]");
          } else if (model.has("spawn")) {
            recipeToSpawn = model.getString("spawn");
            logger.info("Recipe to spawn when notification tapped: " + recipeToSpawn);
          }
        }
        String text = model.optString("text", "");
        showNotification(text, shellCommandPayload, recipeToSpawn);
        break;

      default:
        // TODO(sjmiles): handle unknown modalities gracefully (it's not exceptional, should log tho)
        //throw new AssertionError("Unhandled modality: " + modality);
        break;
    }
  }

  private void showNotification(String title, String shellCommandPayload, String recipeToSpawn) {
    int notificationId = this.notificationId++;
    Intent intent = new Intent(this, MainActivity.class)
            .setAction(ACTION_HANDLE_NOTIFICATION)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

    if (recipeToSpawn != null) {
      intent.putExtra(EXTRA_NOTIFICATION_SPAWN_RECIPE, recipeToSpawn);
    } else {
      intent.putExtra(EXTRA_NOTIFICATION_SHELL_COMMAND, shellCommandPayload);
    }

    PendingIntent pendingIntent = PendingIntent.getActivity(this, notificationId, intent, PendingIntent.FLAG_ONE_SHOT);
    Notification notification = new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setSmallIcon(R.drawable.baseline_sms_black_24)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build();
    notificationManager.notify(notificationId, notification);
  }

  /** Show a toast from the web page */
  @JavascriptInterface
  public void showToast(String toast) {
    Toast.makeText(this, toast, Toast.LENGTH_SHORT).show();
  }

  /** Called when the WebView is ready. */
  @JavascriptInterface
  public void onLoad() {
    logger.info("onLoad called");
    shellWebView.post(() -> {
      shellWebView.evaluateJavascript("window.DeviceClient = { receive(json) { Android.receive(json); } };", null);
      shellWebView.evaluateJavascript("window.startTheShell();", null);
    });
  }
}
