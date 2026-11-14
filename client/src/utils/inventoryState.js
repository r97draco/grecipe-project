export function removeInventoryItem(items, target) {
  return items.filter(item => target._id ? item._id !== target._id : item !== target);
}

export function appendInventoryItem(items, item) {
  if (items.some(existing => existing.name.toLowerCase() === item.name.toLowerCase())) return items;
  return [...items, { ...item, isLocal: true }];
}
