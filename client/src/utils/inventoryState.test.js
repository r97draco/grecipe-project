import { removeInventoryItem, appendInventoryItem } from './inventoryState';
test('deleting a filtered item keeps hidden items', () => {
  const hidden = {_id:'hidden',name:'Apple'};
  const visible = {_id:'visible',name:'Potato'};
  expect(removeInventoryItem([hidden,visible], visible)).toEqual([hidden]);
});
test('adding while filtered preserves other items and rejects duplicates', () => {
  const items = [{name:'Apple'}];
  expect(appendInventoryItem(items,{name:'Potato'})).toHaveLength(2);
  expect(appendInventoryItem(items,{name:'apple'})).toBe(items);
});
