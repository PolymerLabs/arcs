package arcs

//
// GENERATED CODE -- DO NOT EDIT
//
// Current implementation doesn't support optional field detection

data class Data(
  var num: Double = 0.0, var txt: String = "", var lnk: String = "", var flg: Boolean = false
) : Entity<Data>() {
  override fun decodeEntity(encoded: String): Data? {
    if (encoded.isEmpty()) {
      return null
    }
    val decoder = StringDecoder(encoded)
    this.internalId = decoder.decodeText()
    decoder.validate("|")
    var i = 0
    while (!decoder.done() && i < 4) {
      val name = decoder.upTo(":")
      when (name) {
        "num" -> {
          decoder.validate("N")
          num = decoder.decodeNum()
        }
        "txt" -> {
          decoder.validate("T")
          txt = decoder.decodeText()
        }
        "lnk" -> {
          decoder.validate("U")
          lnk = decoder.decodeText()
        }
        "flg" -> {
          decoder.validate("B")
          flg = decoder.decodeBool()
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
    encoder.encode("num:N", num)
    encoder.encode("txt:T", txt)
    encoder.encode("lnk:U", lnk)
    encoder.encode("flg:B", flg)
    return encoder.result()
  }
}
