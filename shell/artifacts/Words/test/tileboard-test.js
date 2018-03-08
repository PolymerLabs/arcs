// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = chai.assert;

describe('TileBoard', function() {
  const savePickCharWithFrequencies = TileBoard.pickCharWithFrequencies;

  lettersToBoardString =
      (letters) => {
        let lettersWithStyle = '';
        const normalStyle = Tile.StyleToNumber[Tile.Style.NORMAL];
        for (let i = 0; i < letters.length; i++)
          lettersWithStyle += `${letters.charAt(i)}${normalStyle}`;
        return lettersWithStyle;
      }

  function createDefaultBoard(shuffleCount) {
    if (shuffleCount == undefined)
      shuffleCount = 1;
    const letters = 'ABCDEFG' +
        'HIJKLMN' +
        'OPQRSTU' +
        'VWXYZAB' +
        'CDEFGHI' +
        'JKLMNOP' +
        'QRSTUVW';
    return new TileBoard({
      letters: lettersToBoardString(letters),
      shuffleAvailableCount: shuffleCount
    });
  }

  describe('#size', function() {
    it('should return the total tile count', function() {
      assert.equal(createDefaultBoard().size, 49);
    });
  });

  describe('#tileAt()', function() {
    it('should return tiles at specific x/y coordinates', function() {
      const board = createDefaultBoard();
      const tile00 = board.tileAt(0, 0);
      assert.equal(tile00.x, 0);
      assert.equal(tile00.y, 0);
      assert.equal(tile00.letter, 'A');
      const tile35 = board.tileAt(3, 5);
      assert.equal(tile35.x, 3);
      assert.equal(tile35.y, 5);
      assert.equal(tile35.letter, 'M');
      const tile66 = board.tileAt(6, 6);
      assert.equal(tile66.x, 6);
      assert.equal(tile66.y, 6);
      assert.equal(tile66.letter, 'W');
    });
  });

  describe('#tileAtIndex()', function() {
    it('should return tiles at specific indexes', function() {
      const board = createDefaultBoard();
      const tile0 = board.tileAtIndex(0);
      assert.equal(tile0.x, 0);
      assert.equal(tile0.y, 0);
      assert.equal(tile0.letter, 'A');
      const tile38 = board.tileAtIndex(38);
      assert.equal(tile38.x, 3);
      assert.equal(tile38.y, 5);
      assert.equal(tile38.letter, 'M');
      const tile48 = board.tileAtIndex(48);
      assert.equal(tile48.x, 6);
      assert.equal(tile48.y, 6);
      assert.equal(tile48.letter, 'W');
    });
  });

  describe('#applyMove()', function() {
    before(function() {
      TileBoard.pickCharWithFrequencies = () => {
        return '=';
      };
    });

    after(function() {
      TileBoard.pickCharWithFrequencies = savePickCharWithFrequencies;
    });

    it('should destroy tiles at top left corner of board correctly',
       function() {
         const board = createDefaultBoard();
         const tiles = [new Tile(0, 'A'), new Tile(1, 'B'), new Tile(2, 'C')];
         board.applyMove(tiles);
         const expectedBoard = lettersToBoardString(
             '===DEFG' +
             'HIJKLMN' +
             'OPQRSTU' +
             'VWXYZAB' +
             'CDEFGHI' +
             'JKLMNOP' +
             'QRSTUVW');
         assert.equal(board.toString(), expectedBoard);
       });

    it('should destroy all tiles at top of board correctly', function() {
      const board = createDefaultBoard();
      const tiles = [
        new Tile(0, 'A'),
        new Tile(1, 'B'),
        new Tile(2, 'C'),
        new Tile(3, 'D'),
        new Tile(4, 'E'),
        new Tile(5, 'F'),
        new Tile(6, 'G')
      ];
      board.applyMove(tiles);
      const expectedBoard = lettersToBoardString(
          '=======' +
          'HIJKLMN' +
          'OPQRSTU' +
          'VWXYZAB' +
          'CDEFGHI' +
          'JKLMNOP' +
          'QRSTUVW');
      assert.equal(board.toString(), expectedBoard);
    });

    it('should destroy tiles mid-board correctly', function() {
      const board = createDefaultBoard();
      const tiles = [new Tile(16, 'Q'), new Tile(17, 'R'), new Tile(18, 'S')];
      board.applyMove(tiles);
      const expectedBoard = lettersToBoardString(
          'AB===FG' +
          'HICDEMN' +
          'OPJKLTU' +
          'VWXYZAB' +
          'CDEFGHI' +
          'JKLMNOP' +
          'QRSTUVW');
      assert.equal(board.toString(), expectedBoard);
    });

    it('should destroy tiles mid-board multi-row correctly', function() {
      const board = createDefaultBoard();
      const tiles = [
        new Tile(16, 'Q'),
        new Tile(17, 'R'),
        new Tile(18, 'S'),
        new Tile(11, 'L')
      ];
      board.applyMove(tiles);
      const expectedBoard = lettersToBoardString(
          'AB===FG' +
          'HICD=MN' +
          'OPJKETU' +
          'VWXYZAB' +
          'CDEFGHI' +
          'JKLMNOP' +
          'QRSTUVW');
      assert.equal(board.toString(), expectedBoard);
    });

    it('should destroy tiles mid-board multi-row and looping back correctly',
       function() {
         const board = createDefaultBoard();
         const tiles = [
           new Tile(16, 'Q'),
           new Tile(17, 'R'),
           new Tile(18, 'S'),
           new Tile(11, 'L'),
           new Tile(10, 'K'),
           new Tile(9, 'J')
         ];
         board.applyMove(tiles);
         const expectedBoard = lettersToBoardString(
             'AB===FG' +
             'HI===MN' +
             'OPCDETU' +
             'VWXYZAB' +
             'CDEFGHI' +
             'JKLMNOP' +
             'QRSTUVW');
         assert.equal(board.toString(), expectedBoard);
       });

    it('should destroy tiles mid-board multi-row-interspersed and looping back correctly',
       function() {
         const board = createDefaultBoard();
         const tiles = [
           new Tile(16, 'Q'),
           new Tile(17, 'R'),
           new Tile(18, 'S'),
           new Tile(11, 'L'),
           new Tile(4, 'E'),
           new Tile(3, 'D'),
           new Tile(2, 'C')
         ];
         board.applyMove(tiles);
         const expectedBoard = lettersToBoardString(
             'AB===FG' +
             'HI===MN' +
             'OPJK=TU' +
             'VWXYZAB' +
             'CDEFGHI' +
             'JKLMNOP' +
             'QRSTUVW');
         assert.equal(board.toString(), expectedBoard);
       });

    it('should destroy tiles at bottom right corner of board correctly',
       function() {
         const board = createDefaultBoard();
         const tiles =
             [new Tile(46, 'U'), new Tile(47, 'V'), new Tile(48, 'W')];
         board.applyMove(tiles);
         const expectedBoard = lettersToBoardString(
             'ABCD===' +
             'HIJKEFG' +
             'OPQRLMN' +
             'VWXYSTU' +
             'CDEFZAB' +
             'JKLMGHI' +
             'QRSTNOP');
         assert.equal(board.toString(), expectedBoard);
       });

    it('should destroy all tiles at bottom of board correctly', function() {
      const board = createDefaultBoard();
      const tiles = [
        new Tile(42, 'Q'),
        new Tile(43, 'R'),
        new Tile(44, 'S'),
        new Tile(45, 'T'),
        new Tile(46, 'U'),
        new Tile(47, 'V'),
        new Tile(48, 'W')
      ];
      board.applyMove(tiles);
      const expectedBoard = lettersToBoardString(
          '=======' +
          'ABCDEFG' +
          'HIJKLMN' +
          'OPQRSTU' +
          'VWXYZAB' +
          'CDEFGHI' +
          'JKLMNOP');
      assert.equal(board.toString(), expectedBoard);
    });
  });

  describe('#pickCharWithFrequencies()', function() {
    it('should return a single caps alpha character', function() {
      let result = TileBoard.pickCharWithFrequencies();
      assert.equal(result.length, 1);
      assert.isTrue(/[A-Z]/.test(result));
    });
  });

  describe('#indexToX()', function() {
    it('should compute x for index correctly', function() {
      assert.equal(TileBoard.indexToX(0), 0);
      assert.equal(TileBoard.indexToX(6), 6);
      assert.equal(TileBoard.indexToX(7), 0);
      assert.equal(TileBoard.indexToX(48), 6);
    });
  });

  describe('#indexToY()', function() {
    it('should compute y for index correctly', function() {
      assert.equal(TileBoard.indexToY(0), 0);
      assert.equal(TileBoard.indexToY(6), 0);
      assert.equal(TileBoard.indexToY(7), 1);
      assert.equal(TileBoard.indexToY(48), 6);
    });
  });

  describe('#shuffle()', function() {
    it('should not shuffle board with no shuffles remaining', function() {
      let board = createDefaultBoard(0);
      let letters = board.toString();
      assert.equal(board.shuffleAvailableCount, 0);
      assert.isFalse(board.shuffle());
      assert.equal(letters, board.toString());
    });

    it('should shuffle board with a shuffle remaining', function() {
      let board = createDefaultBoard(1);
      let letters = board.toString();
      assert.equal(board.shuffleAvailableCount, 1);
      assert.isTrue(board.shuffle());
      assert.notEqual(letters, board.toString());
      assert.equal(board.shuffleAvailableCount, 0);
    });
  });

  describe('#toString', function() {
    it('should concatenate all tiles into a single string', function() {
      const board = new TileBoard({
        letters: lettersToBoardString(
            'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVW')
      });
      assert.equal(
          lettersToBoardString(
              'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVW'),
          board.toString());
    });
  });

  describe('#isMoveValid()', function() {
    it('should consider initial moves valid', function() {
      const board = createDefaultBoard();
      assert.isTrue(board.isMoveValid([], new Tile(0, 'A')));
    });

    it('should allow selecting the last selected tile', function() {
      const board = createDefaultBoard();
      const tile = new Tile(0, 'A');
      assert.isTrue(board.isMoveValid([tile], tile));
    });

    it('should allow selecting any touching tile from top left corner',
       function() {
         const board = createDefaultBoard();
         const tile = new Tile(0, 'A');
         // Right.
         assert.isTrue(board.isMoveValid([tile], new Tile(1, 'B')));
         // Right and offset below.
         assert.isTrue(board.isMoveValid([tile], new Tile(8, 'I')));
         // Below.
         assert.isTrue(board.isMoveValid([tile], new Tile(7, 'H')));

         assert.isFalse(board.isMoveValid([tile], new Tile(2, 'C')));
         assert.isFalse(board.isMoveValid([tile], new Tile(6, 'G')));
         assert.isFalse(board.isMoveValid([tile], new Tile(9, 'J')));
       });

    it('should allow selecting any touching tile from top right corner',
       function() {
         const board = createDefaultBoard();
         const tile = new Tile(6, 'G');
         // Left.
         assert.isTrue(board.isMoveValid([tile], new Tile(5, 'F')));
         // Left and offset below.
         assert.isTrue(board.isMoveValid([tile], new Tile(12, 'M')));
         // Below.
         assert.isTrue(board.isMoveValid([tile], new Tile(13, 'N')));

         assert.isFalse(board.isMoveValid([tile], new Tile(4, 'E')));
         assert.isFalse(board.isMoveValid([tile], new Tile(7, 'H')));
         assert.isFalse(board.isMoveValid([tile], new Tile(11, 'L')));
         assert.isFalse(board.isMoveValid([tile], new Tile(14, 'O')));
       });

    it('should allow selecting any touching tile from bottom right corner',
       function() {
         const board = createDefaultBoard();
         const tile = new Tile(48, 'W');
         // Above.
         assert.isTrue(board.isMoveValid([tile], new Tile(41, 'P')));
         // Left.
         assert.isTrue(board.isMoveValid([tile], new Tile(47, 'V')));

         assert.isFalse(board.isMoveValid([tile], new Tile(40, 'O')));
         assert.isFalse(board.isMoveValid([tile], new Tile(46, 'U')));
       });

    it('should allow selecting any touching tile from bottom left corner',
       function() {
         const board = createDefaultBoard();
         const tile = new Tile(42, 'Q');
         // Above.
         assert.isTrue(board.isMoveValid([tile], new Tile(35, 'J')));
         // Right.
         assert.isTrue(board.isMoveValid([tile], new Tile(43, 'R')));

         assert.isFalse(board.isMoveValid([tile], new Tile(34, 'I')));
         assert.isFalse(board.isMoveValid([tile], new Tile(36, 'K')));
         assert.isFalse(board.isMoveValid([tile], new Tile(44, 'S')));
       });

    it('should allow selecting any touching tile from an unshifted column in center region',
       function() {
         const board = createDefaultBoard();
         const tile = new Tile(22, 'Y');
         assert.isFalse(tile.isShiftedDown);
         // Above.
         assert.isTrue(board.isMoveValid([tile], new Tile(15, 'R')));
         // Below.
         assert.isTrue(board.isMoveValid([tile], new Tile(29, 'F')));
         // Right.
         assert.isTrue(board.isMoveValid([tile], new Tile(23, 'Z')));
         // Right and offset above.
         assert.isTrue(board.isMoveValid([tile], new Tile(16, 'S')));
         // Left.
         assert.isTrue(board.isMoveValid([tile], new Tile(21, 'X')));
         // Left and offset above.
         assert.isTrue(board.isMoveValid([tile], new Tile(14, 'Q')));

         // Right and offset below.
         assert.isFalse(board.isMoveValid([tile], new Tile(30, 'G')));
         // Left and offset below.
         assert.isFalse(board.isMoveValid([tile], new Tile(28, 'E')));
       });

    it('should allow selecting any touching tile from a shifted column in center region',
       function() {
         const board = createDefaultBoard();
         const tile = new Tile(23, 'Z');
         assert.isTrue(tile.isShiftedDown);
         // Above.
         assert.isTrue(board.isMoveValid([tile], new Tile(16, 'S')));
         // Below.
         assert.isTrue(board.isMoveValid([tile], new Tile(30, 'G')));
         // Right.
         assert.isTrue(board.isMoveValid([tile], new Tile(24, 'A')));
         // Right and offset below.
         assert.isTrue(board.isMoveValid([tile], new Tile(31, 'H')));
         // Left.
         assert.isTrue(board.isMoveValid([tile], new Tile(22, 'Y')));
         // Left and offset below.
         assert.isTrue(board.isMoveValid([tile], new Tile(29, 'F')));

         // Right and offset above.
         assert.isFalse(board.isMoveValid([tile], new Tile(17, 'T')));
         // Left and offset above.
         assert.isFalse(board.isMoveValid([tile], new Tile(15, 'R')));
       });
  });

  // TODO(wkorman): Add tests for game-end on burning tiles, and
  // burning tile behavior on move application when not at bottom.
});
