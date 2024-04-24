const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432, // Assuming PostgreSQL default port is used
  ssl: false, // Assuming SSL is not enabled for local development
});
 
app.post('/api/shoppers', async (req, res) => {
  const { shopperId, shelf } = req.body;
  try {
    // Check if the shopperId exists in the shoppers table
    const shopperExistsQuery = 'SELECT COUNT(*) FROM shoppers WHERE shopper_id = $1';
    const shopperExistsResult = await pool.query(shopperExistsQuery, [shopperId]);
    const shopperExists = parseInt(shopperExistsResult.rows[0].count) > 0;

    if (!shopperExists) {
      return res.status(400).json({ error: 'Shopper ID does not exist' });
    }

    await pool.query('BEGIN');
    for (const item of shelf) {
      const { productId, relevancyScore } = item;
      await pool.query(
        'INSERT INTO shopper_products (shopper_id, product_id, relevancy_score) VALUES ($1, $2, $3) ON CONFLICT (shopper_id, product_id) DO UPDATE SET relevancy_score = EXCLUDED.relevancy_score',
        [shopperId, productId, relevancyScore]
      );
    }
    await pool.query('COMMIT');
    res.status(201).send({ message: 'Shopper info updated' });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).send({ error: error.message });
  }
});


// Internal API to store product metadata
app.post('/api/products', async (req, res) => {
  const { productId, category, brand } = req.body;
  try {
    await pool.query(
      'INSERT INTO products (product_id, category, brand) VALUES ($1, $2, $3) ON CONFLICT (product_id) DO UPDATE SET category = EXCLUDED.category, brand = EXCLUDED.brand',
      [productId, category, brand]
    );
    res.status(201).send({ message: 'Product metadata updated' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// External API to retrieve products based on filters
app.get('/api/products', async (req, res) => {
  const { shopperId, category, brand, limit = 10 } = req.query;
  try {
    let query = `
      SELECT p.product_id, p.category, p.brand, sp.relevancy_score
      FROM products p
      INNER JOIN shopper_products sp ON sp.product_id = p.product_id
      WHERE sp.shopper_id = $1`;

    const queryParams = [shopperId];
    let paramIndex = 2;

    if (category) {
      query += ` AND p.category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (brand) {
      query += ` AND p.brand = $${paramIndex}`;
      queryParams.push(brand);
      paramIndex++;
    }

    query += ` ORDER BY sp.relevancy_score DESC LIMIT $${paramIndex}`;
    queryParams.push(limit);

    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
