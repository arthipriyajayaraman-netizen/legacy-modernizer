const sessions = new Map();

function create(session) {
  sessions.set(session.id, session);
  return session;
}

function get(id) {
  return sessions.get(id);
}

function update(id, updates) {
  const session = sessions.get(id);
  if (!session) return null;
  Object.assign(session, updates);
  return session;
}

function remove(id) {
  return sessions.delete(id);
}

module.exports = { create, get, update, remove };
