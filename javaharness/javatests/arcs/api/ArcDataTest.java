package arcs.api;

import static org.junit.Assert.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

@RunWith(JUnit4.class)
public class ArcDataTest {

  @Test
  public void testEmpty() {
    ArcData arcData = new ArcData.Builder().build();
    assertFalse(arcData.getSessionId().isEmpty());
    assertFalse(arcData.getArcId().isEmpty());
    assertFalse(arcData.getPecId().isEmpty());
    assertNull(arcData.getRecipe());
    verifyNullParticle(arcData);
  }

  @Test
  public void testWithArcId() {
    String arcId = "test-arc";
    ArcData arcData = new ArcData.Builder().setArcId(arcId).build();
    assertEquals(arcId, arcData.getArcId());
    assertTrue(arcData.getPecId().contains(arcId));
    verifyNullParticle(arcData);
  }

  @Test
  public void testWithArcAndPecIds() {
    String arcId = "test-arc";
    String pecId = "test-pec";
    ArcData arcData = new ArcData.Builder().setArcId(arcId).setPecId(pecId).build();
    assertEquals(arcId, arcData.getArcId());
    assertEquals(pecId, arcData.getPecId());
    verifyNullParticle(arcData);
  }

  @Test
  public void testWithParticleName() {
    String recipe = "TestRecipe";
    String particleName = "TestParticle";
    ArcData arcData = new ArcData.Builder()
        .setParticleName(particleName)
        .setRecipe(recipe)
        .build();
    assertEquals(recipe, arcData.getRecipe());
    assertEquals(particleName, arcData.getParticleName());
    verifyGenerateParticleId(arcData);
    assertNull(arcData.getParticle());
    assertNull(arcData.getProvidedSlotId());
  }

  @Test
  public void testWithParticleNameAndId() {
    String particleName = "TestParticle";
    String particleId = "test-particle-id";
    ArcData arcData = new ArcData.Builder()
        .setParticleName(particleName)
        .setParticleId(particleId)
        .build();
    assertEquals(particleName, arcData.getParticleName());
    assertEquals(particleId, arcData.getParticleId());
    assertNull(arcData.getParticle());
    assertNull(arcData.getProvidedSlotId());
  }

  @Test
  public void testWithParticle() {
    String particleName = "TestParticle";
    String particleId = "test-particle-id";
    ArcData arcData = new ArcData.Builder()
        .setParticle(new ParticleBase() {
          @Override public String getId() { return particleId; }
          @Override public String getName() { return particleName; }
        })
        .build();
    assertEquals(particleName, arcData.getParticleName());
    assertEquals(particleId, arcData.getParticleId());
    assertNotNull(arcData.getParticle());
    assertNull(arcData.getProvidedSlotId());
  }

  @Test
  public void testWithParticleAndSlot() {
    String arcId = "test-arc";
    String particleName = "TestParticle";
    ArcData arcData = new ArcData.Builder()
        .setArcId(arcId)
        .setParticle(new ParticleBase() {
          @Override public String getName() { return particleName; }
          @Override public boolean providesSlot() { return true; }
        })
        .build();
    assertEquals(particleName, arcData.getParticleName());
    assertNotNull(arcData.getArcId());
    verifyGenerateParticleId(arcData);
    assertNotNull(arcData.getParticle());
    verifyGenerateProvidedSlotId(arcData);
  }

  @Test
  public void testIllegalParticleInfo() {
    try {
      new ArcData.Builder().setParticleName("P").setParticle(new ParticleBase() {});
      fail();
    } catch (IllegalArgumentException e) {
      // expected excaption;
    }
    try {
      new ArcData.Builder().setParticleId("id0").setParticle(new ParticleBase() {});
      fail();
    } catch (IllegalArgumentException e) {
      // expected excaption;
    }
    try {
      new ArcData.Builder().setParticle(new ParticleBase() {}).setParticleName("P");
      fail();
    } catch (IllegalArgumentException e) {
      // expected excaption;
    }
  }

  private void verifyGenerateParticleId(ArcData arcData) {
    assertTrue(arcData.getParticleId().contains(arcData.getArcId().substring(1)));
    assertTrue(arcData.getParticleId().contains("particle"));
  }

  private void verifyGenerateProvidedSlotId(ArcData arcData) {
    assertTrue(arcData.getProvidedSlotId().contains(arcData.getArcId().substring(1)));
    assertTrue(arcData.getProvidedSlotId().contains("slotId"));
  }

  private void verifyNullParticle(ArcData arcData) {
    assertNull(arcData.getParticle());
    assertNull(arcData.getParticleName());
    assertNull(arcData.getParticleId());
    assertNull(arcData.getProvidedSlotId());
  }
}