const puppeteer = require("puppeteer");
const chalk = require("chalk");
var fs = require("fs");
const path = require('path');
const zipArray = require('zip-array');
const lodash = require('lodash')

const { cities, specialties}  = require("./keywords");



const error = chalk.bold.red;
const success = chalk.keyword("green");



(async ()=>{

    const selectors = {
        "Name": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > a > div > h2`,
        "Profession": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > div.u-grey_3-text > div.u-d-flex > span > h3 > span`,
        "Overall Experience": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > div.u-grey_3-text > div.uv2-spacer--xs-top > div`,
        "Consultation Fee": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > div.uv2-spacer--sm-top > div.uv2-spacer--xs-top > span:nth-child(1) > span`,
        "Location": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > div.uv2-spacer--sm-top > div.u-bold.u-d-inlineblock.u-valign--middle > a > span.u-t-capitalize`,
        "profileLink": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(3) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > a`
    }


    var targetInitialSelector = `.c-filter__top__wrapper`;

    // browser instance
    var browser = await puppeteer.launch({ headless: false });
    //  open a new page
    var page = await browser.newPage();

    // for each city 
    //      - for each specialty
    const targetURLS = [];

    for(const city of cities){
        for(const specialty of specialties){
            const filters  = [];
            filters.push({
                word: specialty,
                category: "subspeciality",
                autocompleted: true
            });

            const filterString = JSON.stringify(filters);

            const urlParams = new URLSearchParams();
            urlParams.append("results_type","doctor");
            urlParams.append("q", filterString);
            urlParams.append("city", city);

            const url = `https://www.practo.com/search?${urlParams.toString()}`;
            targetURLS.push(url);
        }
    };

    const responses = [];

    for await (const [index, url] of targetURLS.entries()){
        try{
            await page.goto(url);
            await page.waitForSelector(targetInitialSelector);

            const canProceed = await page.evaluate(() => {
               try{
                   const resultSpan = document.querySelector(`#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div.u-spacer--right-less.uv2-cushion--lg-vt.uv2-cushion--lg-bottom.uv2-cushion--sm-hz.uv2-spacer--sm-bottom > h1 > span:nth-child(1)`)
                   
                   const numstr = resultSpan.innerText.trim() || 0;
                   console.log(`skipping because of ${Number(numstr)} records thre`)
                   
                   const altSpan = document.querySelector("#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div.u-color--grey5.u-spacer--vertical-9x > p");

                   if(altSpan) return true;
                   
                   return Number(numstr) > 0;
               }catch(e){
                   console.log("skipping because some error");
                   return false;
               }
            });
            if(canProceed === false){
                continue;
            };

            await page.evaluate(scrollToBottom);


            const progress = index / targetURLS.length * 100;

            console.log({
                url,
                progress
            });

            const response = await page.evaluate(() => {
                const selectors = {
                    "Name": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > a > div > h2`,
                    "Profession": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > div.u-grey_3-text > div.u-d-flex > span > h3 > span`,
                    "Overall Experience": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > div.u-grey_3-text > div.uv2-spacer--xs-top > div`,
                    "Consultation Fee": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > div.uv2-spacer--sm-top > div.uv2-spacer--xs-top > span:nth-child(1) > span`,
                    "Location": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > div.uv2-spacer--sm-top > div.u-bold.u-d-inlineblock.u-valign--middle > a > span.u-t-capitalize`,
                    "profileLink": `#container > div:nth-child(3) > div > div.pure-g.null > div.pure-u-17-24.c-listing__left > div > div:nth-child(2) > div > div.listing-doctor-card > div.u-d-flex > div.info-section > a`
                };

                const obj = {};
                for (const [property, selector] of Object.entries(selectors)) {
                    switch(property){
                        case "Name":
                        case "Profession":
                        case "Location":
                        case "Consultation Fee":
                            obj[property] = [...document.querySelectorAll(selector)].map(node => node.innerText.replaceAll(",", " ")); //
                            break;
                        case "Overall Experience":
                            obj[property] = [...document.querySelectorAll(selector)].map(node => node.innerText.split(" ")[0]);
                            break;
                        case "profileLink":
                            obj[property] = [...document.querySelectorAll(selector)].map(node => node.href);
                            break;
                    }
                }

                return obj
            });

            const cols = Object.values(response);
            const zipped = lodash.zip(...cols);
            
            for(const arr of zipped){
                const obj = {
                    "Name": arr[0],
                    "Profession": arr[1],
                    "Overall Experience": arr[2],
                    "Consultation Fee": arr[3],
                    "Location": arr[4],
                    "profileLink": arr[5]
                };
                responses.push(obj);
            };


        }catch(err){
            error(`oops with ${url}`);
            console.log(err);
        }
       
    };

    const batch = 1;
    
    const data =formatResponses(responses);

    await fs.writeFileSync(path.join(__dirname, `data-${batch}.${Date.now()}.json`), JSON.stringify(responses)); // for reference 
    await fs.writeFileSync(path.join(__dirname, `data-${batch}.${Date.now()}.csv`), data);

    // close the browsers after 
    browser.close();

    // do something with whole data;

    function formatResponses(responses){
        
        const uniqueObjects = lodash.uniqBy(responses, 'profileLink');

        const rows = [];

        for(const obj of uniqueObjects){
            delete obj["profileLink"];
            const row = Object.values(obj).join(",")
            rows.push(row);
        };
    
        return rows.join("\n") // coma separated rows data;
    }

    async function scrollToBottom() {
        await new Promise((resolve) => {
            var scrollTop = -1;
            const interval = setInterval(() => {
                window.scrollBy(0, 100);
                if (document.documentElement.scrollTop !== scrollTop) {
                    scrollTop = document.documentElement.scrollTop;
                    return;
                }
                clearInterval(interval);
                resolve();
            }, 100);
        })
    }
})();

