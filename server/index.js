const express = require('express');
const path = require('path');
const config = require('./config');
const sessionsRouter = require('./routes/sessions');

const app = express();

app.use(express.json());
app.use(express.static(path.join(config.rootDir, 'public')));

app.get('/api/config', (req, res) => {
  res.json({
    defaultRepoUrl: config.defaultRepoUrl,
    defaultBranch: config.defaultBranch,
  });
});

app.use('/api/sessions', sessionsRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(config.rootDir, 'public', 'index.html'));
});

app.listen(config.port, () => {
  console.log(`Legacy Modernizer running at http://localhost:${config.port}`);
});
