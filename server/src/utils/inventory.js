const foodByName = require('../data/foodByName.json');
const normalize = text => text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const singular = word => word.endsWith('ies') ? word.slice(0,-3)+'y' : word.endsWith('oes') ? word.slice(0,-2) : word.endsWith('s') && !word.endsWith('ss') ? word.slice(0,-1) : word;
const aliases = new Map();
// Use complete food names; partial dictionary aliases can turn “snow” into “snow crab”.
for (const food of Object.values(foodByName)) {
  const name = normalize(food.name);
  if (name.length >= 3) aliases.set(name,{name:food.name,key:name});
}
const commonAliases = {
  potato:'Potato', potatoes:'Potato', tomato:'Garden tomato', tomatoes:'Garden tomato',
  banana:'Banana', bananas:'Banana', apple:'Apple', apples:'Apple', egg:'Eggs', eggs:'Eggs',
  onion:'Garden onion', onions:'Garden onion', milk:'Milk (Cow)', bread:'Other bread',
  'grn onion':'Green onion', 'chkn breast':'Chicken breast', 'bnls chicken':'Chicken',
};
for (const [alias,name] of Object.entries(commonAliases)) {
  aliases.set(alias,{name,key:aliases.get(normalize(name))?.key || null});
}

const ignored = /^(?:sub\s*total|total|tax|gst|pst|hst|cash|change|credit|debit|visa|mastercard|payment|balance|tender|savings|discount|coupon|loyalty|points|thank|welcome|receipt|store|cashier|register|transaction|date|time|tel|phone|www|https?)\b/i;
const price = /\$?\d+[.,]\d{2}\s*[A-Z]?\s*$/i;

exports.parseReceiptText = text => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14);
  const defaultExpiry = [expiry.getFullYear(), String(expiry.getMonth() + 1).padStart(2, '0'), String(expiry.getDate()).padStart(2, '0')].join('-');
  const items = [];
  for (const original of String(text || '').split(/\r?\n/).slice(0,500)) {
    const line = original.trim().slice(0,300);
    if (!line || ignored.test(line) || /^[-=*\s\d.,/:]+$/.test(line)) continue;
    let product = line.replace(price,'').trim();
    const explicitQuantity = product.match(/^(\d{1,3})\s*[x@]\s+/i);
    const quantity = explicitQuantity ? Number(explicitQuantity[1]) : 1;
    if (explicitQuantity) product = product.slice(explicitQuantity[0].length);
    product = product.replace(/^\d{4,14}\s+/,'').replace(/\s+\d+\s*(?:ml|kg|g|l|oz|lb|pk|ct)\b/gi,' ').trim();
    const normalized = normalize(product);
    if (!/[a-z]{3}/i.test(normalized)) continue;
    const cleaned = normalized.replace(/\b(?:organic|org|fresh|large|small|medium|frozen|ea)\b/g,' ').replace(/\s+/g,' ').trim();
    const words = cleaned.split(' ').map(singular).join(' ');
    const food = aliases.get(normalized) || aliases.get(cleaned) || aliases.get(words);
    // Keep plausible unknown product lines for review rather than silently dropping them.
    if (!food && (!price.test(line) || product.length < 3 || product.length > 90)) continue;
    items.push({
      name:food?.name || product,
      quantity:quantity > 0 ? quantity : 1,
      quantitySource:explicitQuantity && quantity > 0 ? 'receipt' : 'unconfirmed',
      expiresAt:defaultExpiry,
      expirySource:'default',
      fooDBKey:food?.key || null,
      sourceLine:line,
      matchType:food ? 'matched' : 'unmatched',
    });
  }
  return items;
};
