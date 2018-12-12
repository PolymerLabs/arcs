
export const getEntityManifest = entity => {
  switch (entity.type) {
    case 'tv_show':
      return getTVMazeManifest(entity);
    case 'artist':
      return getArtistManifest(entity);
  }
};

const getTVMazeManifest = entity => {
  return `
import 'https://$particles/Pipes/TVMazePipe.recipes'

resource FindShowResource
  start
  [{"name": "${entity.name}"}]

store FindShow of TVMazeFind 'findShow' in FindShowResource

recipe TVShowFindInfo
  use 'findShow' as find
  create #piped #tv_show as show
  TVMazeFindShow
    find = find
    show = show
    `;
};

const getArtistManifest = entity => {
  return `
import 'https://$particles/Music/Artist.recipes'

resource ArtistFindResource
  start
  [{"name": "${entity.name}"}]

store FindArtist of ArtistFind 'findArtist' in ArtistFindResource

recipe ArtistFindInfo
  use 'findArtist' as find
  create #piped #artist as artist
  ArtistFinder
    find = find
    artist = artist
    `;
};
