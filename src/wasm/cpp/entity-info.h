#ifndef _ARCS_ENTITY_INFO_H
#define _ARCS_ENTITY_INFO_H

// GENERATED CODE - DO NOT EDIT

namespace arcs {

class Info {
public:
  const std::string& _for() const { return for_; }
  void set_for(const std::string& value) { for_ = value; for_valid_ = true; }
  void clear_for() { for_ = std::string(); for_valid_ = false; }
  bool has_for() const { return for_valid_; }

  double val() const { return val_; }
  void set_val(double value) { val_ = value; val_valid_ = true; }
  void clear_val() { val_ = double(); val_valid_ = false; }
  bool has_val() const { return val_valid_; }

  std::string _internal_id;  // TODO

private:
  std::string for_ = std::string();
  bool for_valid_ = false;

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
    } else if (name == "for") {
      decoder.validate("T");
      decoder.decode(entity->for_);
      entity->for_valid_ = true;
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
  if (entity.has_for())
    encoder.encode("for:T", entity._for());
  if (entity.has_val())
    encoder.encode("val:N", entity.val());
  return std::move(encoder.result());
}

template<>
std::string entity_to_str(const Info& entity, const char* join) {
  internal::StringPrinter printer;
  printer.addId(entity._internal_id);
  if (entity.has_for())
    printer.add("for: ", entity._for());
  if (entity.has_val())
    printer.add("val: ", entity.val());
  return std::move(printer.result(join));
}

}  // namespace arcs

#endif
