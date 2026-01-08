const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5434,
  user: 'dev_user',
  password: 'dev_password',
  database: 'nirmaya_dev'
});

pool.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'water_quality_calculations' 
    AND column_name IN ('wqi', 'wqi_classification', 'params_analyzed')
  ORDER BY column_name
`).then(res => {
  console.log('WQI-related columns in water_quality_calculations:');
  console.log(res.rows);
  pool.end();
}).catch(err => {
  console.error('Error:', err.message);
  pool.end();
});
