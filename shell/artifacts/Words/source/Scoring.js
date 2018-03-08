/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

// Selected words must be at least this long for submission.
const MINIMUM_WORD_LENGTH = 3;

// Base score points for each character.
const CHAR_SCORE = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 2,
  G: 2,
  H: 1,
  I: 1,
  J: 3,
  K: 3,
  L: 2,
  M: 2,
  N: 3,
  O: 1,
  P: 2,
  Q: 3,
  R: 1,
  S: 1,
  T: 1,
  U: 3,
  V: 3,
  W: 3,
  X: 3,
  Y: 3,
  Z: 3
};

// Multiplier applied based on word length. Tuples as (length, multiplier).
// So 3 character words have no multiplier, 4 is 2x, etc.
const WORD_LENGTH_MULTIPLIERS = [[3, 1], [4, 2], [6, 3], [8, 4], [12, 5]];

class Scoring {
  static _wordLengthMultiplier(wordLength) {
    for (let i = 0; i < WORD_LENGTH_MULTIPLIERS.length; i++) {
      if (wordLength <= WORD_LENGTH_MULTIPLIERS[i][0])
        return WORD_LENGTH_MULTIPLIERS[i][1];
    }
    return WORD_LENGTH_MULTIPLIERS[WORD_LENGTH_MULTIPLIERS.length - 1][1];
  }
  static isMinimumWordLength(length) {
    return length >= MINIMUM_WORD_LENGTH;
  }
  static pointsForLetter(letter) {
    return CHAR_SCORE[letter];
  }
  static wordScore(tiles) {
    return (
        Scoring._wordLengthMultiplier(tiles.length) *
        tiles.reduce(
            (accumulator, t) => accumulator + CHAR_SCORE[t.letter], 0));
  }
  static longestWordText(stats) {
    return stats && stats.longestWord ?
        `${stats.longestWord} (${stats.longestWordScore})` :
        '(none yet)';
  }
  static highestScoringWordText(stats) {
    return stats && stats.highestScoringWord ?
        `${stats.highestScoringWord} (${stats.highestScoringWordScore})` :
        '(none yet)';
  }
  static scoreToMessage(stats) {
    return `Words Puzzle Game Stats -- Highest scoring word: ${
        stats.highestScoringWord} (${
        stats.highestScoringWordScore}). Longest word: ${stats.longestWord} (${
        stats.longestWordScore}). Score: ${stats.score}. Moves: ${
        stats.moveCount}.`;
  }
  static applyMoveStats(user, stats, word, score) {
    let updatedValues = {
      highestScoringWord: stats.highestScoringWord,
      highestScoringWordScore: stats.highestScoringWordScore,
      longestWord: stats.longestWord,
      longestWordScore: stats.longestWordScore,
      startstamp: stats.startstamp
    };

    // Update highest scoring word if needed.
    if (!stats.highestScoringWord || stats.highestScoringWordScore < score) {
      updatedValues.highestScoringWord = word;
      updatedValues.highestScoringWordScore = score;
    }

    // Update longest word if needed.
    if (!stats.longestWord || stats.longestWord.length < word.length) {
      updatedValues.longestWord = word;
      updatedValues.longestWordScore = score;
    }

    updatedValues.score = stats.score + score;
    updatedValues.moveCount = stats.moveCount + 1;

    // Fill in the social post information as an interim way to display
    // something in the aggregated social feed.
    updatedValues.createdTimestamp = stats.startstamp;
    updatedValues.message = Scoring.scoreToMessage(updatedValues);
    updatedValues.author = user.id;

    return updatedValues;
  }
  static create(user) {
    const now = Date.now();
    return {
      score: 0,
      moveCount: 0,
      startstamp: now,
      author: user.id,
      createdTimestamp: now,
      message: 'Word Puzzle Game Stats - New game.'
    };
  }
}
