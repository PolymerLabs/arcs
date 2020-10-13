package arcs.android.demo

import org.webrtc.SdpObserver
import org.webrtc.SessionDescription

open class SimpleSdpObserver : SdpObserver {
  override fun onCreateSuccess(sessionDescription: SessionDescription?) {}
  override fun onSetSuccess() {}
  override fun onCreateFailure(s: String?) {}
  override fun onSetFailure(s: String?) {}
}
