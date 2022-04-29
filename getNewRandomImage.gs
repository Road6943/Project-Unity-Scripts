const SCORES_SHEET_NAME = "Scores";
const SCORES_IMAGES_COLUMN = "E";
const CELL_TO_INSERT_IMAGE_IN = "'Random Score Generator'!A2"

// Return a list of all the image links from the scores sheet
function getAllImageLinks() {
  let scoresSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCORES_SHEET_NAME);
  // makes a range like "E:E"
  let imageLinksRange = SCORES_IMAGES_COLUMN + ":" + SCORES_IMAGES_COLUMN;
  // get all values in the column with the image links, this is currently a 2D array of [ ["link1"], ["link2"], ["link3"], ... ]
  let imageLinksColumnValues = scoresSheet.getRange(imageLinksRange).getValues();
  // convert 2D array of rows into a 1D array with just the first item in each row (the actual image link)
  // [ ["link1"], ["link2"], ["link3"], ... ] => [ "link1", "link2", "link3", ... ]
  let allImageLinks = imageLinksColumnValues.map(row => row[0]);
  // some cells in the image column are empty or do not contain image links, so remove those
  allImageLinks = allImageLinks.filter(link => link.includes("http"));
  return allImageLinks;
}

// Get a random item in a list
function getRandomItem(list) {
  let randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

function insertImageInCell(imageLink) {
  // https://www.labnol.org/internet/images-in-google-spreadsheet/18167/#google_vignette
  try {
    // built the image from its url
    let cellImage = SpreadsheetApp.newCellImage()
      .setSourceUrl(imageLink)
      .build()
      .toBuilder();
    
    // insert the image into the right cell
    let cell = SpreadsheetApp.getActiveSpreadsheet().getRange(CELL_TO_INSERT_IMAGE_IN);
    cell.setValue(cellImage);

  } catch (error) {
    Browser.msgBox(error.message);
  }
}

function getNewRandomImage() {
  let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let allImageLinks = getAllImageLinks(spreadsheet);
  let randomImageLink = getRandomItem(allImageLinks);
  insertImageInCell(randomImageLink);
}
