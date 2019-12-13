/// BareSpecifier=moment\src\lib\create\from-string-and-array
import { copyConfig } from '../moment/constructor.js';
import { configFromStringAndFormat } from './from-string-and-format.js';
import getParsingFlags from './parsing-flags.js';
import { isValid } from './valid.js';
import extend from '../utils/extend.js';

// date from string and array of format strings
export function configFromStringAndArray(config) {
    var tempConfig, bestMoment, scoreToBeat, i, currentScore;

    if (config._f.length === 0) {
        getParsingFlags(config).invalidFormat = true;
        config._d = new Date(NaN);
        return;
    }

    for (i = 0; i < config._f.length; i++) {
        currentScore = 0;
        tempConfig = copyConfig({}, config);
        if (config._useUTC != null) {
            tempConfig._useUTC = config._useUTC;
        }
        tempConfig._f = config._f[i];
        configFromStringAndFormat(tempConfig);

        if (!isValid(tempConfig)) {
            continue;
        }

        // if there is any input that was not parsed add a penalty for that format
        currentScore += getParsingFlags(tempConfig).charsLeftOver;

        //or tokens
        currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

        getParsingFlags(tempConfig).score = currentScore;

        if (scoreToBeat == null || currentScore < scoreToBeat) {
            scoreToBeat = currentScore;
            bestMoment = tempConfig;
        }
    }

    extend(config, bestMoment || tempConfig);
}