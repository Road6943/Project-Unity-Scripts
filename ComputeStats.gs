function gatherData(sheetsToGatherDataFrom) {
  const allSheetsValues = {};

  for (const sheetName of sheetsToGatherDataFrom) {
    const sheetValues = 
      SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(sheetName)
        .getDataRange()
        .getValues()
        ;
    
    allSheetsValues[sheetName] = sheetValues;
  }

  return allSheetsValues;
}


function formatData(allSheetsValues) {
  const rowTypes = {tank: 0, labels: 1, data: 2, empty: 3 };
  
  const detectRowType = function(row) {
    const firstItem = row[0].trim().toLowerCase();

    if (firstItem.startsWith("top")) return rowTypes.tank;
    else if (firstItem.includes("score")) return rowTypes.labels;
    else if (firstItem === "") return rowTypes.empty;
    else return rowTypes.data;
  };

  const extractTankName = function(sentence) {
    // all tank name sentences are formatted like this:
    // Top 10 <tank name> scores ever recorded

    sentence = sentence.split(" ");
    let tankName = sentence[2]
    
    for (let i = 3; i < sentence.length; i++) {
      // tank name ends once you hit "scores"
      if (sentence[i].toLowerCase().includes("score")) {
        break;
      }

      tankName += (" " + sentence[i]);
    }

    return tankName;
  }

  const allScores = [];

  for (const sheetName in allSheetsValues) {
    let currentTank = null;
    let currentScoreRank = 1;

    for (const row of allSheetsValues[sheetName]) {
      const currentRowType = detectRowType(row);

      if (currentRowType === rowTypes.labels) {
        continue;
      }

      else if (currentRowType === rowTypes.empty) {
        // signals end of tank table, next line will begin new tank table
        currentScoreRank = 1;
      }

      else if (currentRowType === rowTypes.tank) {
        currentTank = extractTankName(row[0]);
      }

      // actual data row
      else {
        const [ score, player, mode, link ] = row;

        const newScore = {
          tank: currentTank,
          tankCategory: sheetName,
          rank: currentScoreRank,
          score,
          player,
          mode,
          link
        };

        allScores.push(newScore);
        ++currentScoreRank;
      }
    }
  }
  return allScores;
}


function computeSumsOfScoresOfPlayers(scores) {
  const scoreSums = {};

  for (const score of scores) {
    const player = score.player;

    if (player in scoreSums) {
      scoreSums[player] += score.score;
    } else {
      scoreSums[player] = score.score;
    }
  }

  return scoreSums;
}


function getCustomSortFunc(sumsOfScoresOfPlayers) {
  return function (a, b) {
    // in the event of a tie (e.g. two players with same total placements or same num of first places)
    // then the winner of the tie is the player who has a higher total score sum
    // aka the sum of all their scores across all the sheets
    // read up on js's sort comparators for more info on this function:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort

    // sort normally when not equal
    if (a[1] !== b[1]) {
      return b[1] - a[1];
    } else {
      return sumsOfScoresOfPlayers[b[0]] - sumsOfScoresOfPlayers[a[0]];
    }
  }
}


function computePlayersWithMostPlacements(scores, customSortFunc) {
  const players = {};
  
  for (const score of scores) {
    const player = score.player;

    if (player in players) {
      players[player] += 1;
    } else {
      players[player] = 1;
    }
  }

  return Object.entries(players).sort(customSortFunc);
}


function computePlayersWithMostNumOneSpots(scores, customSortFunc) {
  const players = {};

  for (const score of scores) {
    if (score.rank !== 1) continue;

    const player = score.player;
    if (player in players) {
      players[player] += 1;
    } else {
      players[player] = 1;
    }
  }

  return Object.entries(players).sort(customSortFunc);
}


function printToSheet(data, topLeftCell) {
  // values will be printed onto the sheet starting from the topLeftCell
  const topLeftCol = topLeftCell[0].toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 1;
  const topLeftRow = topLeftCell[1];

  const sheetToPrintTo =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName("Stats")

  // clear entire columns before printing to them
  const rangeToClear = 
    sheetToPrintTo
      .getRange(topLeftRow, topLeftCol, sheetToPrintTo.getLastRow(), data[0].length)
  
  rangeToClear.clearContent();
  
  const rangeToPrintTo = 
    sheetToPrintTo
      .getRange(topLeftRow, topLeftCol, data.length, data[0].length);

  rangeToPrintTo.setValues(data);
}


sheetsToGatherDataFrom = [
  "Unfocused Spammers", 
  "Focused Spammers", 
  "Auto Tanks", 
  "Builders", 
  "Drone Tanks", 
  "Snipers", 
  "Cruisers", 
  "Underseers", 
  "Trappers", 
  "Tri Angles", 
  "Smashers", 
  "Miniguns", 
  "Spawners", 
  "Destroyers",  
];


function main() {
  const gatheredData = gatherData(sheetsToGatherDataFrom);
  const formattedData = formatData(gatheredData);
  
  // used for tie-breaking
  const sumsOfScoresOfPlayers = computeSumsOfScoresOfPlayers(formattedData);
  const customSortFunc = getCustomSortFunc(sumsOfScoresOfPlayers);
  
  const playersWithMostPlacements = computePlayersWithMostPlacements(formattedData, customSortFunc);
  const playersWithMostNumOneSpots = computePlayersWithMostNumOneSpots(formattedData, customSortFunc);
  
  printToSheet(playersWithMostPlacements, "G4");
  printToSheet(playersWithMostNumOneSpots, "C4");
}


function onEdit(event) {
  const editedSheetName = event.range.getSheet().getName();

  // non-data gathering sheet was edited
  if (!sheetsToGatherDataFrom.includes(editedSheetName)) {
    return;
  }

  main();
}








