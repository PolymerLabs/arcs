import {Runtime} from "../runtime/runtime";
import {Manifest} from "../runtime/manifest";
import {Recipe} from "../runtime/recipe/recipe";
import {CapabilitiesResolver, StorageKeyCreatorsMap} from "../runtime/capabilities-resolver";
import {IdGenerator} from "../runtime/id";


/** Reads a manifest and outputs generated Kotlin plans. */
export async function recipe2plan(path: string): Promise<string> {

  const manifest = await Runtime.parseFile(path);

  const resolutions = await resolveManifest(manifest);

  const plans = generatePlans(resolutions);

  return plans.join('\n');
}

interface Resolution {}

function generatePlans(resolutions: Resolution[]): string[] {
  return [''];
}

async function resolveManifest(manifest: Manifest): Promise<Resolution[]> {

  const recipes: Recipe[] = manifest.recipes;

  const longRunningRecipes = recipes.filter(r => isLongRunning(r.triggers));

  for (const r of longRunningRecipes) {
    const arcId = IdGenerator.newSession().newArcId(getArcId(r.triggers));
    if (arcId == null) continue;

    const resolver = new CapabilitiesResolver({arcId}, buildStorageKeyCreatorMap(r));

    createKeysForCreatedHandles(r, resolver);

  }

  return [{}];
}

/** Predicate determines if we should create storage keys on a recipe. */
function isLongRunning(triggers: [string, string][][]): boolean {
  let hasArcId = false;
  let isLaunchedAtStartup = false;

  for (const trigger of triggers) {
    for (const pair of trigger) {
      if (pair[0] == 'arcId') {
        hasArcId = true;
      }
      if (pair[0] == 'launch' && pair[1] == 'startup') {
        isLaunchedAtStartup = true;
      }
    }
  }

  return hasArcId && isLaunchedAtStartup;
}

function getArcId(triggers: [string, string][][]): string | null {
  for (const trigger of triggers) {
    for (const pair of trigger) {
      if (pair[0] == 'arcId') {
        return pair[1];
      }
    }
  }

  return null;
}

function buildStorageKeyCreatorMap(recipe: Recipe): StorageKeyCreatorsMap {
  return CapabilitiesResolver.getDefaultCreators();
}

function createKeysForCreatedHandles(recipe: Recipe, resolver: CapabilitiesResolver) {

}
