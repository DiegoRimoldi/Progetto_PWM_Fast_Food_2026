const express = require('express');
const setupSwagger = require('./swagger');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());

// In-memory data store
let users = [];
let idCounter = 1;

// Swagger setup
setupSwagger(app);

/**
 * GET /users
 * Retrieve all users
 */
app.get('/users', (req, res) => {
  res.status(200).json(users);
});

/**
 * GET /users/:id
 * Retrieve user by ID
 */
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json(user);
});

/**
 * POST /users
 * Create new user
 */
app.post('/users', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      message: 'Name and email are required'
    });
  }

  const newUser = {
    id: idCounter++,
    name,
    email
  };

  users.push(newUser);

  res.status(201).json(newUser);
});

/**
 * PUT /users/:id
 * Update user
 */
app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email } = req.body;

  const user = users.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!name || !email) {
    return res.status(400).json({
      message: 'Name and email are required'
    });
  }

  user.name = name;
  user.email = email;

  res.status(200).json(user);
});

/**
 * DELETE /users/:id
 * Delete user
 */
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  users.splice(userIndex, 1);

  res.status(200).json({
    message: 'User deleted successfully'
  });
});

/**
 * Global error handler (basic)
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error'
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api-docs`);
});
