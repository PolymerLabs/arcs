#ifndef _ARCS_ENTITY_INFO_H
#define _ARCS_ENTITY_INFO_H

// GENERATED CODE - DO NOT EDIT

namespace arcs {

class Info {
public:
  const std::string& str() const { return str_; }
  void set_str(const std::string& value) { str_ = value; str_valid_ = true; }
  void clear_str() { str_ = std::string(); str_valid_ = false; }
  bool has_str() const { return str_valid_; }

  double val() const { return val_; }
  void set_val(double value) { val_ = value; val_valid_ = true; }
  void clear_val() { val_ = double(); val_valid_ = false; }
  bool has_val() const { return val_valid_; }

  std::string _internal_id;  // TODO

private:
  std::string str_ = std::string();
  bool str_valid_ = false;

  double val_ = double();
  bool val_valid_ = false;

  static const int FIELD_COUNT = 2;
  friend void decode_entity<Info>(Info* entity, const char* str);
};

template<>
void decode_entity(Info* entity, const char* str) {
  if (str == nullptr) return;
  internal::StringDecoder decoder(str);
  decoder.decode(entity->_internal_id);
  decoder.validate("|");
  for (int i = 0; !decoder.done() && i < Info::FIELD_COUNT; i++) {
    std::string name = decoder.upTo(':');
    if (0) {
    } else if (name == "str") {
      decoder.validate("T");
      decoder.decode(entity->str_);
      entity->str_valid_ = true;
    } else if (name == "val") {
      decoder.validate("N");
      decoder.decode(entity->val_);
      entity->val_valid_ = true;
    }
    decoder.validate("|");
  }
}

template<>
std::string encode_entity(const Info& entity) {
  internal::StringEncoder encoder;
  encoder.encode("", entity._internal_id);
  if (entity.has_str())
    encoder.encode("str:T", entity.str());
  if (entity.has_val())
    encoder.encode("val:N", entity.val());
  return std::move(encoder.result());
}

template<>
std::string entity_to_str(const Info& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id);
  if (entity.has_str())
    printer.add("str: ", entity.str());
  if (entity.has_val())
    printer.add("val: ", entity.val());
  return std::move(printer.result(join));
}

}  // namespace arcs

#endif
