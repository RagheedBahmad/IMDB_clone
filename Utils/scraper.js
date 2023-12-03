const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const url = "https://www.imdb.com/pressroom/?ref_=ft_pr";

axios
  .get(url)
  .then((response) => {
    const html = response.data;
    const htmlContent = response.data;
    const $ = cheerio.load(html);
    let scrapedData = "";

    // Extract h1 elements
    $("h1").each((index, element) => {
      scrapedData += `<h1>${$(element).text()}</h1>\n`;
    });

    // Extract h3 elements
    $("h3").each((index, element) => {
      scrapedData += `<h3>${$(element).text()}</h3>\n`;
    });

    // Extract p elements
    $("p").each((index, element) => {
      scrapedData += `<p>${$(element).text()}</p>\n`;
    });

    // Write the data to an HTML file
    fs.writeFile("press.ejs", scrapedData, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log("Scraped data saved to press.ejs");
    });
  })
  .catch(console.error);
