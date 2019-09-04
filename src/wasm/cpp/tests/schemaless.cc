#include <arcs.h>

class SchemalessTest : public arcs::Particle {
public:
  std::string getTemplate(const std::string& slot_name) override {
    return "no schemas here!";
  }
};

DEFINE_PARTICLE(SchemalessTest)
