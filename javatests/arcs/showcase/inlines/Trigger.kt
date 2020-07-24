package arcs.showcase.inlines

class Trigger : AbstractTrigger() {
  
    override fun onUpdate() {
      val trigger = handles.signal.fetch()
      if (trigger) {
        handles.output.store(handles.input.fetch())
      }
    }
}
