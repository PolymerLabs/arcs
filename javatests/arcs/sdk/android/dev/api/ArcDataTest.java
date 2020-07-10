package arcs.sdk.android.dev.api;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

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
    assertEquals(0, arcData.getParticleList().size());
  }

  @Test
  public void testWithArcId() {
    String arcId = "test-arc";
    ArcData arcData = new ArcData.Builder().setArcId(arcId).build();
    assertEquals(arcId, arcData.getArcId());
    assertTrue(arcData.getPecId().contains(arcId));
    assertEquals(0, arcData.getParticleList().size());
  }

  @Test
  public void testWithArcAndPecIds() {
    String arcId = "test-arc";
    String pecId = "test-pec";
    ArcData arcData = new ArcData.Builder().setArcId(arcId).setPecId(pecId).build();
    assertEquals(arcId, arcData.getArcId());
    assertEquals(pecId, arcData.getPecId());
    assertEquals(0, arcData.getParticleList().size());
  }

  @Test
  public void testWithParticleName() {
    String recipe = "TestRecipe";
    String particleName = "TestParticle";
    ArcData arcData = new ArcData.Builder()
      .addParticleData(new ArcData.ParticleData().setName(particleName))
      .setRecipe(recipe)
      .build();
    assertEquals(recipe, arcData.getRecipe());
    assertEquals(1, arcData.getParticleList().size());
    ArcData.ParticleData particleData = arcData.getParticleList().get(0);
    assertEquals(particleName, particleData.getName());
    verifyGenerateParticleId(arcData, 0);
    assertNull(particleData.getParticle());
    assertNull(particleData.getProvidedSlotId());
  }

  @Test
  public void testWithParticleNameAndId() {
    String particleName = "TestParticle";
    String particleId = "test-particle-id";
    ArcData arcData = new ArcData.Builder()
      .addParticleData(new ArcData.ParticleData().setName(particleName).setId(particleId))
      .build();
    assertEquals(1, arcData.getParticleList().size());
    ArcData.ParticleData particleData = arcData.getParticleList().get(0);
    assertEquals(particleName, particleData.getName());
    assertEquals(particleId, particleData.getId());
    assertNull(particleData.getParticle());
    assertNull(particleData.getProvidedSlotId());
  }

  @Test
  public void testWithParticle() {
    String particleName = "TestParticle";
    String particleId = "test-particle-id";
    ArcData arcData = new ArcData.Builder()
      .addParticleData(new ArcData.ParticleData().setParticle(new ParticleBase() {
        @Override
        public String getId() {
          return particleId;
        }

        @Override
        public String getName() {
          return particleName;
        }
      }))
      .build();
    assertEquals(1, arcData.getParticleList().size());
    ArcData.ParticleData particleData = arcData.getParticleList().get(0);
    assertEquals(particleName, particleData.getName());
    assertEquals(particleId, particleData.getId());
    assertNotNull(particleData.getParticle());
    assertNull(particleData.getProvidedSlotId());
  }

  @Test
  public void testWithParticleAndSlot() {
    String arcId = "test-arc";
    String particleName = "TestParticle";
    ArcData arcData = new ArcData.Builder()
      .setArcId(arcId)
      .addParticleData(new ArcData.ParticleData().setParticle(new ParticleBase() {
        @Override
        public String getName() {
          return particleName;
        }

        @Override
        public boolean providesSlot() {
          return true;
        }
      }))
      .build();
    assertEquals(1, arcData.getParticleList().size());
    ArcData.ParticleData particleData = arcData.getParticleList().get(0);
    assertEquals(particleName, particleData.getName());
    assertNotNull(arcData.getArcId());
    verifyGenerateParticleId(arcData, 0);
    assertNotNull(particleData.getParticle());
    verifyGenerateProvidedSlotId(arcData, 0);
  }

  @Test
  public void testMultipleParticles() {
    String arcId = "test-arc";
    String particleName0 = "TestParticle0";
    String particleName1 = "TestParticle1";
    ArcData arcData = new ArcData.Builder()
      .setArcId(arcId)
      .addParticleData(new ArcData.ParticleData().setName(particleName0))
      .addParticleData(new ArcData.ParticleData().setParticle(new ParticleBase() {
        @Override
        public String getName() {
          return particleName1;
        }

        @Override
        public boolean providesSlot() {
          return true;
        }
      }))
      .build();
    assertNotNull(arcData.getArcId());
    assertEquals(2, arcData.getParticleList().size());

    ArcData.ParticleData particleData0 = arcData.getParticleList().get(0);
    assertEquals(particleName0, particleData0.getName());
    verifyGenerateParticleId(arcData, 0);
    assertNull(particleData0.getParticle());
    assertNull(particleData0.getProvidedSlotId());

    ArcData.ParticleData particleData1 = arcData.getParticleList().get(1);
    assertEquals(particleName1, particleData1.getName());
    verifyGenerateParticleId(arcData, 1);
    assertNotNull(particleData1.getParticle());
    verifyGenerateProvidedSlotId(arcData, 1);
  }

  @Test
  public void testIllegalParticleInfo() {
    ArcData.ParticleData particleData1 = new ArcData.ParticleData().setName("P");
    try {
      particleData1.setParticle(new ParticleBase() {
      });
      fail();
    } catch (IllegalArgumentException e) {
      // expected exception;
    }

    ArcData.ParticleData particleData2 = new ArcData.ParticleData().setId("id0");
    try {
      particleData2.setParticle(new ParticleBase() {
      });
      fail();
    } catch (IllegalArgumentException e) {
      // expected exception;
    }
    ArcData.ParticleData particleData3 = new ArcData.ParticleData().setParticle(new ParticleBase() {
    });
    try {
      particleData3.setName("P");
      fail();
    } catch (IllegalArgumentException e) {
      // expected exception;
    }
  }

  private void verifyGenerateParticleId(ArcData arcData, int index) {
    assertTrue(arcData.getParticleList().size() > index);
    ArcData.ParticleData particleData = arcData.getParticleList().get(index);
    assertTrue(particleData.getId().contains(arcData.getArcId().substring(1)));
    assertTrue(particleData.getId().contains("particle"));
  }

  private void verifyGenerateProvidedSlotId(ArcData arcData, int index) {
    assertTrue(arcData.getParticleList().size() > index);
    String providedSlotId = arcData.getParticleList().get(index).getProvidedSlotId();
    assertTrue(providedSlotId.contains(arcData.getArcId().substring(1)));
    assertTrue(providedSlotId.contains("slotId"));
  }
}
