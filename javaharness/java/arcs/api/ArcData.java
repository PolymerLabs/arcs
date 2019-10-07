package arcs.api;

public class ArcData {
  private String arcId;
  private String pecId;
  private String recipe;
  private ParticleData particleData = new ParticleData();
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

  public String getParticleId() {
    return particleData.getId();
  }

  public String getParticleName() {
    return particleData.getName();
  }

  public Particle getParticle() {
    return particleData.particle;
  }

  public String getProvidedSlotId() {
    return particleData.providedSlotId;
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

    public Builder setParticleId(String particleId) {
      arcData.particleData.setId(particleId);
      return this;
    }

    public Builder setParticleName(String particleName) {
      arcData.particleData.setName(particleName);
      return this;
    }

    public Builder setParticle(Particle particle) {
      arcData.particleData.setParticle(particle);
      return this;
    }

    public Builder setProvidedSlotId(String providedSlotId) {
      arcData.particleData.setProvidedSlotId(providedSlotId);
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
      arcData.particleData.normalize(idGenerator, arcId);
      arcData.sessionId = idGenerator.getSessionId();
      return arcData;
    }
  }

  static class ParticleData {
    String name;
    String id;
    // Only one of either {particleId, particleName}, or particle can be set.
    Particle particle;
    // TODO: should be a name->id map. atm only support providing a single slot.
    String providedSlotId;

    String getId() {
      return particle == null ? id : particle.getId();
    }

    String getName() {
      return particle == null ? name : particle.getName();
    }
    
    void setId(String id) {
      if (this.particle != null) {
        throw new IllegalArgumentException("Cannot set particle id - particle already set");
      }
      this.id = id;
    }

    void setName(String name) {
      if (this.particle != null) {
        throw new IllegalArgumentException("Cannot set particle name - particle already set");
      }
      this.name = name;
    }

    void setParticle(Particle particle) {
      if (name != null || id != null) {
        throw new IllegalArgumentException(
            "Cannot set particle - particle name and/or id already set");
      }
      this.particle = particle;
    }

    void setProvidedSlotId(String providedSlotId) {
      this.providedSlotId = providedSlotId;
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
