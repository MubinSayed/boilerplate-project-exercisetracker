const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

require('dotenv').config();

//* Middleware

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//* MongoDB

mongoose.connect(process.env.DB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

//* Schemas

const exerciseSchema = new mongoose.Schema({
	userId: String,
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: String,
});

const userSchema = new mongoose.Schema({
	username: String,
});

//* Models

let User = mongoose.model('User', userSchema);

let Exercise = mongoose.model('Exercise', exerciseSchema);

//* Endpoints

app.get('/', async (_req, res) => {
	res.sendFile(__dirname + '/views/index.html');
	await User.syncIndexes();
	await Exercise.syncIndexes();
});

/*
 * GET
 * Get all users
 */
app.get('/api/users', function (_req, res) {
	console.log('### get all users ###'.toLocaleUpperCase());

	User.find({})
    .select('-__v')
    .then(users => res.json(users))
    .catch(err => res.status(400).json({ error: err.message }));
});

/*
 * POST
 * Create a new user
 */
app.post('/api/users', function (req, res) {
	const inputUsername = req.body.username;

	console.log('### create a new user ###'.toLocaleUpperCase());

	//? Create a new user
	let newUser = new User({ username: inputUsername });

	newUser.save()
    .then(user => res.json({ username: user.username, _id: user._id }))
    .catch(err => res.status(400).json({ error: err.message }));
});

/*
 * POST
 * Add a new exercise
 * @param _id
 */
app.post('/api/users/:_id/exercises', function (req, res) {
	var userId = req.params._id;
	var description = req.body.description;
	var duration = req.body.duration;
	var date = req.body.date;

	console.log('### add a new exercise ###'.toLocaleUpperCase());

	//? Check for date
	if (!date) {
		date = new Date().toISOString().substring(0, 10);
	}

	console.log(
		'looking for user with id ['.toLocaleUpperCase() + userId + '] ...'
	);

	const newExercise = new Exercise({ 
    userId: userId, 
    description: description, 
    duration: parseInt(duration),
    date: date 
  });

  newExercise.save()
    .then(exercise => {
      User.findById(userId)
        .then(user => {
          
          res.json({
            username: user.username,
            _id: user._id,
            description: exercise.description,
            duration: exercise.duration,
            date: new Date(exercise.date).toDateString()
          });
          
        })
        .catch(err => res.status(400).json({ error: err.message }));
    })
    .catch(err => res.status(400).json({ error: err.message }));
});

/*
 * GET
 * Get a user's exercise log
 * @param _id
 */
app.get('/api/users/:_id/logs', async function (req, res) {
	const userId = req.params._id;
	const from = req.query.from || new Date(0).toISOString().substring(0, 10);
	const to =
		req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
	const limit = Number(req.query.limit) || 0;

	console.log('### get the log from a user ###'.toLocaleUpperCase());

	//? Find the user
	let user = await User.findById(userId).exec();

	console.log(
		'looking for exercises with id ['.toLocaleUpperCase() + userId + '] ...'
	);

	//? Find the exercises
	let exercises = await Exercise.find({
		userId: userId,
		date: { $gte: from, $lte: to },
	})
		.select('description duration date')
		.limit(limit)
		.exec();

	let parsedDatesLog = exercises.map((exercise) => {
		return {
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
		};
	});

	res.json({
		_id: user._id,
		username: user.username,
		count: parsedDatesLog.length,
		log: parsedDatesLog,
	});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});