package arcs.api;

import java.util.ArrayList;
import java.util.List;

public class ArcData {
  private String arcId;
  private String pecId;
  private String recipe;
  private List<ParticleData> particleList = new ArrayList<>();
  private String sessionId;

  public String getArcId() {
    return arcId;
  }

  public String getPecId() {
    return pecId;
  }

  public String getRecipe() {
    return recipe;
  }

  public List<ParticleData> getParticleList() {
    return particleList;
  }

  public String getSessionId() {
    return sessionId;
  }

  public static class Builder {
    private final ArcData arcData = new ArcData();
    private final IdGenerator idGenerator = IdGenerator.newSession();

    public Builder setArcId(String arcId) {
      arcData.arcId = arcId;
      return this;
    }

    public Builder setPecId(String pecId) {
      arcData.pecId = pecId;
      return this;
    }

    public Builder setRecipe(String recipe) {
      arcData.recipe = recipe;
      return this;
    }

    public Builder addParticleData(ParticleData particleData) {
      arcData.particleList.add(particleData);
      return this;
    }

    public ArcData build() {
      Id arcId;
      if (arcData.arcId == null) {
        arcId = Id.newArcId();
        arcData.arcId = arcId.toString();
      } else {
        arcId = Id.fromString(arcData.arcId);
      }
      if (arcData.pecId == null) {
        arcData.pecId = idGenerator.newChildId(arcId, "pec").toString();
      }
      arcData.getParticleList().forEach(data -> data.normalize(idGenerator, arcId));
      arcData.sessionId = idGenerator.getSessionId();
      return arcData;
    }
  }

  public static class ParticleData {
    String name;
    String id;
    // Only one of either {particleId, particleName}, or particle can be set.
    Particle particle;
    // TODO: should be a name->id map. atm only support providing a single slot.
    String providedSlotId;

    public String getId() {
      return particle == null ? id : particle.getId();
    }

    public String getName() {
      return particle == null ? name : particle.getName();
    }

    public String getProvidedSlotId() {
      return providedSlotId;
    }

    public Particle getParticle() {
      return particle;
    }
    
    public ParticleData setId(String id) {
      if (this.particle != null) {
        throw new IllegalArgumentException("Cannot set particle id - particle already set");
      }
      this.id = id;
      return this;
    }

    public ParticleData setName(String name) {
      if (this.particle != null) {
        throw new IllegalArgumentException("Cannot set particle name - particle already set");
      }
      this.name = name;
      return this;
    }

    public ParticleData setParticle(Particle particle) {
      if (name != null || id != null) {
        throw new IllegalArgumentException(
            "Cannot set particle - particle name and/or id already set");
      }
      this.particle = particle;
      return this;
    }

    public ParticleData setProvidedSlotId(String providedSlotId) {
      this.providedSlotId = providedSlotId;
      return this;
    }

    void normalize(IdGenerator idGenerator, Id arcId) {
      if (name != null) {
        if (id == null) {
          id = idGenerator.newChildId(arcId, "particle").toString();
        }
      }
      if (particle != null) {
        if (particle.getId() == null) {
          particle.setId(idGenerator.newChildId(arcId, "particle").toString());
        }
        providedSlotId =
            particle.providesSlot() ? idGenerator.newChildId(arcId, "slotId").toString() : null;
      }
    }
  }
}
