// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = chai.assert;

describe('Scoring', function() {
  describe('#isMinimumWordLength()', function() {
    it('should report word length requirements correctly', function() {
      assert.isFalse(Scoring.isMinimumWordLength(0));
      assert.isTrue(Scoring.isMinimumWordLength(3));
      assert.isTrue(Scoring.isMinimumWordLength(30));
    });
  });

  describe('#pointsForLetter()', function() {
    it('should report letter points correctly', function() {
      assert.equal(Scoring.pointsForLetter('A'), 1);
      assert.equal(Scoring.pointsForLetter('O'), 1);
      assert.equal(Scoring.pointsForLetter('Z'), 3);
    });
  });

  describe('#wordScore()', function() {
    function tilesForWord(word) {
      let tiles = [];
      for (let i = 0; i < word.length; i++) {
        tiles.push(new Tile(i, word.charAt(i)));
      }
      return tiles;
    }
    it('should score a basic word correctly', function() {
      assert.equal(Scoring.wordScore(tilesForWord('ABC')), 7);
      assert.equal(Scoring.wordScore(tilesForWord('ABCD')), 18);
    });
    it('should score a word with a multiplier correctly', function() {
      assert.equal(Scoring.wordScore(tilesForWord('ABCD')), 18);
    });
    it('should score a word with exactly the maximum multiplier correctly',
       function() {
         assert.equal(Scoring.wordScore(tilesForWord('ABCDABCDABCD')), 135);
       });
    it('should score a word with more chars than specified by the maximum multiplier correctly',
       function() {
         assert.equal(Scoring.wordScore(tilesForWord('ABCDABCDABCDABCD')), 180);
       });
  });

  describe('#longestWordText()', function() {
    it('should report none for empty stats or word', function() {
      assert.equal(Scoring.longestWordText(undefined), '(none yet)');
      assert.equal(
          Scoring.longestWordText({longestWord: undefined}), '(none yet)');
      assert.equal(Scoring.longestWordText({longestWord: ''}), '(none yet)');
    });

    it('should report formatted text when values present', function() {
      assert.equal(
          Scoring.longestWordText({longestWord: 'foo', longestWordScore: 42}),
          'foo (42)');
    });
  });

  describe('#highestScoringWordText()', function() {
    it('should report none for empty stats or word', function() {
      assert.equal(Scoring.highestScoringWordText(undefined), '(none yet)');
      assert.equal(
          Scoring.highestScoringWordText({highestScoringWord: undefined}),
          '(none yet)');
      assert.equal(
          Scoring.highestScoringWordText({highestScoringWord: ''}),
          '(none yet)');
    });

    it('should report formatted text when values present', function() {
      assert.equal(
          Scoring.highestScoringWordText(
              {highestScoringWord: 'foo', highestScoringWordScore: 42}),
          'foo (42)');
    });
  });

  describe('#applyMoveStats()', function() {
    const validateStats = (actual, expected) => {
      var actualCopy = Object.assign({}, actual);
      // TODO(wkorman): We hack in Post data currently. Revisit this and add
      // specific relevant tests.
      delete actualCopy.author;
      delete actualCopy.createdTimestamp;
      delete actualCopy.message;
      assert.deepEqual(actualCopy, expected);
    };

    it('should persist existing stats', function() {
      const stats = {
        highestScoringWord: 'highest',
        highestScoringWordScore: 43,
        longestWord: 'longest',
        longestWordScore: 56,
        score: 0,
        moveCount: 0,
        startstamp: 7331
      };
      const user = { id: '42'};
      const actual = Scoring.applyMoveStats(user, stats, 'short', 38);
      validateStats(actual, {
        highestScoringWord: 'highest',
        highestScoringWordScore: 43,
        longestWord: 'longest',
        longestWordScore: 56,
        score: 38,
        moveCount: 1,
        startstamp: 7331
      });
    });

    it('should update existing highest scoring word', function() {
      const stats = {
        highestScoringWord: 'highest',
        highestScoringWordScore: 43,
        longestWord: 'longest',
        longestWordScore: 56,
        score: 0,
        moveCount: 0,
        startstamp: 7331
      };
      const user = { id: '42'};
      const actual = Scoring.applyMoveStats(user, stats, 'higher', 100);
      validateStats(actual, {
        highestScoringWord: 'higher',
        highestScoringWordScore: 100,
        longestWord: 'longest',
        longestWordScore: 56,
        score: 100,
        moveCount: 1,
        startstamp: 7331
      });
    });

    it('should update undefined highest scoring word', function() {
      const stats = {
        highestScoringWord: undefined,
        highestScoringWordScore: undefined,
        longestWord: 'longest',
        longestWordScore: 56,
        score: 0,
        moveCount: 0,
        startstamp: 7331
      };
      const user = { id: '42'};
      const actual = Scoring.applyMoveStats(user, stats, 'higher', 100);
      validateStats(actual, {
        highestScoringWord: 'higher',
        highestScoringWordScore: 100,
        longestWord: 'longest',
        longestWordScore: 56,
        score: 100,
        moveCount: 1,
        startstamp: 7331
      });
    });

    it('should update existing longest word', function() {
      const stats = {
        highestScoringWord: 'highest',
        highestScoringWordScore: 43,
        longestWord: 'longest',
        longestWordScore: 56,
        score: 0,
        moveCount: 0,
        startstamp: 7331
      };
      const user = { id: '42'};
      const actual = Scoring.applyMoveStats(user, stats, 'evenlonger', 23);
      validateStats(actual, {
        highestScoringWord: 'highest',
        highestScoringWordScore: 43,
        longestWord: 'evenlonger',
        longestWordScore: 23,
        score: 23,
        moveCount: 1,
        startstamp: 7331
      });
    });

    it('should update undefined longest word', function() {
      const stats = {
        highestScoringWord: 'highest',
        highestScoringWordScore: 43,
        longestWord: undefined,
        longestWordScore: undefined,
        score: 0,
        moveCount: 0,
        startstamp: 7331
      };
      const user = { id: '42'};
      const actual = Scoring.applyMoveStats(user, stats, 'evenlonger', 23);
      validateStats(actual, {
        highestScoringWord: 'highest',
        highestScoringWordScore: 43,
        longestWord: 'evenlonger',
        longestWordScore: 23,
        score: 23,
        moveCount: 1,
        startstamp: 7331
      });
    });

    it('should update all of the things', function() {
      const stats = {
        highestScoringWord: 'highest',
        highestScoringWordScore: 43,
        longestWord: 'longest',
        longestWordScore: 56,
        score: 8118,
        moveCount: 345,
        startstamp: 7331
      };
      const user = { id: '42'};
      const actual = Scoring.applyMoveStats(user, stats, 'evenlonger', 2300);
      validateStats(actual, {
        highestScoringWord: 'evenlonger',
        highestScoringWordScore: 2300,
        longestWord: 'evenlonger',
        longestWordScore: 2300,
        score: 10418,
        moveCount: 346,
        startstamp: 7331
      });
    });
  });
});
