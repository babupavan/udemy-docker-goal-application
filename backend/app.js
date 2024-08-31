const fs = require('fs');
const path = require('path');

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const Goal = require('./models/goal');

const app = express();

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Access log configuration
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));

// Error log configuration
const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

// Middleware
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Routes
app.get('/goals', async (req, res, next) => {
  console.log('TRYING TO FETCH GOALS');
  try {
    const goals = await Goal.find();
    res.status(200).json({
      goals: goals.map((goal) => ({
        id: goal.id,
        text: goal.text,
      })),
    });
    console.log('FETCHED GOALS');
  } catch (err) {
    console.error('ERROR FETCHING GOALS');
    console.error(err.message);
    errorLogStream.write(`${new Date().toISOString()} - ${err.stack}\n`);
    res.status(500).json({ message: 'Failed to load goals.' });
  }
});

app.post('/goals', async (req, res, next) => {
  console.log('TRYING TO STORE GOAL');
  const goalText = req.body.text;

  if (!goalText || goalText.trim().length === 0) {
    console.log('INVALID INPUT - NO TEXT');
    return res.status(422).json({ message: 'Invalid goal text.' });
  }

  const goal = new Goal({
    text: goalText,
  });

  try {
    await goal.save();
    res
      .status(201)
      .json({ message: 'Goal saved', goal: { id: goal.id, text: goalText } });
    console.log('STORED NEW GOAL');
  } catch (err) {
    console.error('ERROR SAVING GOAL');
    console.error(err.message);
    errorLogStream.write(`${new Date().toISOString()} - ${err.stack}\n`);
    res.status(500).json({ message: 'Failed to save goal.' });
  }
});

app.delete('/goals/:id', async (req, res, next) => {
  console.log('TRYING TO DELETE GOAL');
  try {
    await Goal.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Deleted goal!' });
    console.log('DELETED GOAL');
  } catch (err) {
    console.error('ERROR DELETING GOAL');
    console.error(err.message);
    errorLogStream.write(`${new Date().toISOString()} - ${err.stack}\n`);
    res.status(500).json({ message: 'Failed to delete goal.' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log to console
  errorLogStream.write(`${new Date().toISOString()} - ${err.stack}\n`);
  res.status(500).send('Something went wrong!');
});

// MongoDB connection
mongoose.connect(
  'mongodb://172.17.0.2:27017/course-goals',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) {
      console.error('FAILED TO CONNECT TO MONGODB');
      console.error(err);
    } else {
      console.log('CONNECTED TO MONGODB');
      app.listen(80, () => {
        console.log('Server running on port 80');
      });
    }
  }
);
