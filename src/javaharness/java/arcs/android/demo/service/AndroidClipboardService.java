package arcs.android.demo.service;

import android.content.ClipboardManager;
import android.content.ClipboardManager.OnPrimaryClipChangedListener;
import android.content.Context;
import android.util.Log;

import java.util.function.Consumer;

import javax.inject.Inject;

import arcs.android.api.Annotations.AppContext;
import arcs.demo.services.ClipboardService;

import static android.content.ClipDescription.MIMETYPE_TEXT_PLAIN;

public class AndroidClipboardService implements ClipboardService {

  private Context ctx;
  private OnPrimaryClipChangedListener onPrimaryClipChangedListener;

  @Inject
  public AndroidClipboardService(@AppContext Context ctx) {
    this.ctx = ctx;
  }

  @Override
  public void listen(Consumer<String> pasted) {
    ClipboardManager clipboard = (ClipboardManager) ctx.getSystemService(Context.CLIPBOARD_SERVICE);
    if (onPrimaryClipChangedListener != null) {
      clipboard.removePrimaryClipChangedListener(onPrimaryClipChangedListener);
    }

    onPrimaryClipChangedListener =
        () -> {
          try {
            if (clipboard.hasPrimaryClip()
                && clipboard.getPrimaryClipDescription().hasMimeType(MIMETYPE_TEXT_PLAIN)
                && clipboard.getPrimaryClip().getItemCount() > 0) {
              pasted.accept(clipboard.getPrimaryClip().getItemAt(0).getText().toString());
            }
          } catch (Throwable t) {
            Log.e("Arcs", "Error in clipboard handling", t);
          }
        };
    clipboard.addPrimaryClipChangedListener(onPrimaryClipChangedListener);
  }
}
