const { pool } = require('./config/db');
pool.query('SELECT * FROM cheques WHERE type = $1', ['{{selType.selectedOptionValue}}'])
  .then(res => console.log(res.rows))
  .catch(console.error)
  .finally(() => pool.end());
