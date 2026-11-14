const store = require('../database/sqlite');
module.exports = {
  async createItem(data) { return store.create('items', data); },
  async createItems(data) { return store.transaction(() => data.map(item => store.create('items', item))); },
  async updateItem(id, data) { return store.update('items', id, data); },
  async deleteItem(id) { return store.remove('items', id); },
  async getItemsByUser(familyId) { return store.all('items', 'familyId', familyId); },
  async getItemsByFamily(familyId) { return store.all('items', 'familyId', familyId); },
};
