/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-unused-vars */
// called like priceFiller.js

const axios = require('axios');

const lots = [];
let metaData = {};

const sleep = miliSeconds => new Promise(resolve => setTimeout(resolve, miliSeconds));

// get page form db via api
async function getPage(page, pageSize) {
  const response = await axios.get(`http://localhost:3001/api/lots?page=${page}&per_page=${pageSize}`);
  const { documents, meta } = response.data;
  metaData = meta;
  lots.push(...documents);
}

async function putLot(lot, updateObj, retry) {
  const { priceInt, plPriceInt, uaPriceInt } = updateObj;
  try {
    return await axios.put(`http://localhost:3001/api/lots/${lot.lotID}`,
      { priceInt, plPriceInt, uaPriceInt });
  } catch (err) {
    if (retry === 1) throw err;
    await sleep(800);
    return await putLot(lot, updateObj, retry - 1);
  }
}

async function updateLotPrices(lot) {
  const priceInt = (lot.price !== undefined) ? Number(lot.price.replace(/[^0-9.]+/g, '')) : null;
  const plPriceInt = (lot.plPrice !== undefined) ? Number(lot.plPrice.replace(/[^0-9.]+/g, '')) : null;
  const uaPriceInt = (lot.uaPrice !== undefined) ? Number(lot.uaPrice.replace(/[^0-9.]+/g, '')) : null;
  try {
    await putLot(lot, { priceInt, plPriceInt, uaPriceInt }, 3);
  } catch (err) {
    console.log(`problem with ${lot.lotID}`);
  }

  // try {
  //   const response = await axios.put(`http://localhost:3001/api/lots/${lot.lotID}`,
  //     { priceInt, plPriceInt, uaPriceInt });
  // } catch (err) {
  //   console.log(`problem with ${lot.lotID}`);
  // }
}

// pageSize specify data chuncks to get from db
async function main(pageSize) {
  // get first page to know how many is to update
  await getPage(1, pageSize);
  const { pagesCount } = metaData;
  for (let i = 2; i <= pagesCount; i += 1) {
    await getPage(i, pageSize);
  }
  console.log(lots.length);
  for (const lot of lots) {
    await updateLotPrices(lot);
    await sleep(800);
  }
}

main(50);
