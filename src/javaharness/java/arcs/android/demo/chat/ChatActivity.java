package arcs.android.demo.chat;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

/**
 * Demo activity of a long-running arc (chat app). Demo lets you simulate
 * starting/stopping/rejoining an arc.
 */
public class ChatActivity extends Activity {

  private InputMethodManager inputMethodManager;
  private String chatLog = "";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    setContentView(R.layout.chat_demo_layout);

    inputMethodManager = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);

    Button submitButton = findViewById(R.id.chat_submit_button);
    submitButton.setOnClickListener(view -> onSubmit());

    EditText editText = findViewById(R.id.chat_message);
    editText.setOnEditorActionListener(
        (TextView v, int actionId, KeyEvent event) -> {
          if (actionId == EditorInfo.IME_ACTION_DONE) {
            onSubmit();
            return true;
          }
          return false;
        });
  }

  private void onSubmit() {
    EditText editText = findViewById(R.id.chat_message);
    String message = editText.getText().toString();

    editText.setText("");
    inputMethodManager.hideSoftInputFromWindow(editText.getApplicationWindowToken(), 0);

    addMessageToChatLog(message);
  }

  private void addMessageToChatLog(String message) {
    // TODO: Use Arcs for the chat log.
    chatLog += message + "\n";

    TextView chatView = findViewById(R.id.chat_log);
    chatView.setText(chatLog);
  }
}
