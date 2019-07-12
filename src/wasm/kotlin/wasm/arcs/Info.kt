package arcs

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

data class Info(
  var for_: String = "", var val_: Double = 0.0
) : Entity<Info>() {
  override fun decodeEntity(encoded: String): Info? {
    if (encoded.isEmpty()) {
      return null
    }
    val decoder = StringDecoder(encoded)
    this.internalId = decoder.decodeText()
    decoder.validate("|")
    var i = 0
    while (!decoder.done() && i < 2) {
      val name = decoder.upTo(":")
      when (name) {
        "for_" -> {
          decoder.validate("T")
          for_ = decoder.decodeText()
        }
        "val_" -> {
          decoder.validate("N")
          val_ = decoder.decodeNum()
        }
      }
      decoder.validate("|")
      i++
    }
    return this
  }

  override fun encodeEntity(): String {
    val encoder = StringEncoder()
    encoder.encode("", internalId)
    encoder.encode("for_:T", for_)
    encoder.encode("val_:N", val_)
    return encoder.result()
  }
}
