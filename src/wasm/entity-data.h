#ifndef _ARCS_ENTITY_DATA_H
#define _ARCS_ENTITY_DATA_H
// GENERATED CODE

namespace arcs {

class Data {
public:
  double num = 0;
  std::string txt;
  URL lnk;
  bool flg = false;
  std::unordered_set<double> c_num;
  std::unordered_set<std::string> c_txt;
  std::unordered_set<URL, HashURL, EqualURL> c_lnk;
  std::unordered_set<bool> c_flg;

  static const int FIELD_COUNT = 8;

  std::string encode() {
    internal::StringEncoder encoder;
    if (num != 0)
      encoder.encodeValue("num:N", num, "|");
    if (!txt.empty())
      encoder.encodeValue("txt:T", txt, "|");
    if (!lnk.href.empty())
      encoder.encodeValue("lnk:U", lnk, "|");
    if (flg)
      encoder.encodeValue("flg:B", flg, "|");
    if (!c_num.empty())
      encoder.encodeCollection("c_num:CN", c_num);
    if (!c_txt.empty())
      encoder.encodeCollection("c_txt:CT", c_txt);
    if (!c_lnk.empty())
      encoder.encodeCollection("c_lnk:CU", c_lnk);
    if (!c_flg.empty())
      encoder.encodeCollection("c_flg:CB", c_flg);
    return std::move(encoder.result());
  }

  static Data decode(const char* str) {
    Data obj;
    internal::StringDecoder decoder(str);
    for (int i = 0; !decoder.done() && i < FIELD_COUNT; i++) {
      std::string name = decoder.upTo(':');
      if (0) {
      } else if (name == "num") {
        decoder.validate("N");
        decoder.decodeValue(obj.num);
      } else if (name == "txt") {
        decoder.validate("T");
        decoder.decodeValue(obj.txt);
      } else if (name == "lnk") {
        decoder.validate("U");
        decoder.decodeValue(obj.lnk);
      } else if (name == "flg") {
        decoder.validate("B");
        decoder.decodeValue(obj.flg);
      } else if (name == "c_num") {
        decoder.validate("CN");
        decoder.decodeCollection(obj.c_num);
      } else if (name == "c_txt") {
        decoder.validate("CT");
        decoder.decodeCollection(obj.c_txt);
      } else if (name == "c_lnk") {
        decoder.validate("CU");
        decoder.decodeCollection(obj.c_lnk);
      } else if (name == "c_flg") {
        decoder.validate("CB");
        decoder.decodeCollection(obj.c_flg);
      }
      decoder.validate("|");
    }
    return obj;
  }
};

}

#endif
