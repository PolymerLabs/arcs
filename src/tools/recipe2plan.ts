import {Runtime} from "../runtime/runtime";
import {Manifest} from "../runtime/manifest";
import {Recipe} from "../runtime/recipe/recipe";
import {CapabilitiesResolver, StorageKeyCreatorsMap} from "../runtime/capabilities-resolver";
import {IdGenerator} from "../runtime/id";
import {Capabilities} from "../runtime/capabilities";
import {Handle} from "../runtime/recipe/handle";


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

  const recipeResolver = new RecipeResolver(manifest);

  for (const r of longRunningRecipes) {
    recipeResolver.resolve(r);
  }

  return [{}];
}

class RecipeResolver {
  constructor(private manifest: Manifest) {

  }

  resolve(recipe: Recipe) {
    const arcId = IdGenerator.newSession().newArcId(this.getArcId(recipe.triggers));
    if (arcId == null) return;

    const resolver = new CapabilitiesResolver({arcId});

    this.createKeysForCreatedHandles(recipe, resolver);

  }


  /** @returns the arcId from annotations on the recipe. */
  getArcId(triggers: [string, string][][]): string | null {
    for (const trigger of triggers) {
      for (const pair of trigger) {
        if (pair[0] == 'arcId') {
          return pair[1];
        }
      }
    }
    return null;
  }

  partitionHandlesByFate(handles: Handle[]) {
    const creates = [];
    const maps = [];

    const combine = (acc, h) => {
      switch(h.fate){
        case 'create':
          return [acc[0].push(h), acc[1]];
        case 'map':
          return [acc[0], acc[1].push(h)];
        default:
          return acc;
      }
    };
    return handles.reduce(combine, [creates, maps]);
  }

  createKeysForCreatedHandles(recipe: Recipe, resolver: CapabilitiesResolver) {
    const createHandles = recipe.handles.filter(h => h.fate == 'create');

    createHandles.forEach(ch => {
      const capabilities = ch.capabilities;
      if(capabilities.isPersistent) {
      }

    });

    const key = resolver.createStorageKey(Capabilities.tiedToRuntime)

  }

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

