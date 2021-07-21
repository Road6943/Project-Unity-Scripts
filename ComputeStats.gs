const SHEET_NAME_TO_GATHER_DATA_FROM = "Scores";

function gatherData() {
  // out: Dict of sheetName(tank category table strip header) => 2D Array of the sheet values of that table strip
  /*
    Previously, each tank category had its own sheet tab consisting of one table column
    Now, all the sheet tabs are combined into one, with each table still in the long columns format,
      but all the table strips are side by side separated by a thin empty column

    To make things easier for myself, I decided to only alter this one function (gatherData)
    To clarify, I modified gatherData so that it gathers all values from the single sheet, and then splits the
      table strips of each tank category. Then, each table strip is put into the Dict/Obj as a separate key/val pair,
      mimicing what happened when each table strip was on its own sheet tab
  */
  const allSheetsValues = {};

  const sheetValues = 
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(SHEET_NAME_TO_GATHER_DATA_FROM)
      .getDataRange()
      .getValues()
      ;

  const numColumns = sheetValues[0].length;
  const numColsPerTankCategoryTable = 4;

  // the +1 is because of the blank column between each tank category table strip
  for (let i = 0; i < numColumns; i += (numColsPerTankCategoryTable + 1)) {
    const tankCategoryName = sheetValues[0][i];
    const tankCategoryData = 
      sheetValues
        .slice(1) // ignore the header row with the tank category name
        .map(row => row.slice(i, i + numColsPerTankCategoryTable)) // get the specific columns we want only
        ;
        
    allSheetsValues[tankCategoryName] = tankCategoryData;
  }

  return allSheetsValues;
}


function formatData(allSheetsValues) {
  // in: Dict of sheetName(tank category table strip header) => 2D Array of the sheet values of that table strip
  // out: List of scoreObjects with various data about every single score on the sheet
  // This func turns the raw spreadsheet data values into a more easily workable format

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
  // in: List of score objects containing information about each score on the sheet
  // out: Dict where each player name is keyed to the total sum of all their scores on the sheet

  const scoreSums = {};

  for (const scoreObj of scores) {
    const player = scoreObj.player;

    // if the score is a string like 1.23m or 4.56M
    if (scoreObj.score.toLowerCase().endsWith('m')) {
      scoreObj.score = parseFloat(scoreObj.score) * 1e6;
    }

    if (player in scoreSums) {
      scoreSums[player] += scoreObj.score;
    } else {
      scoreSums[player] = scoreObj.score;
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
  // in: List of score data objects and a custom sort function
  // out: 2D array that is ready to be printed to the main spreadsheet's stats tab
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
  // in: List of score data objects and a custom sort function
  // out: 2D array that is ready to be printed to the main spreadsheet's stats tab
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
  // topLeftCell should be a string like "A1"; Note that this only works for Cols A-Z
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


function main() {
  const gatheredData = gatherData();
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








