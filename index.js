const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// --- Conexión a MongoDB ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

// --- Modelos ---
const User = mongoose.model('User', new mongoose.Schema({ username: String }))
const Exercise = mongoose.model('Exercise', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  description: String,
  duration: Number,
  date: Date
}))

// --- Crear usuario ---
app.post('/api/users', async (req, res) => {
  const { username } = req.body
  if(!username) return res.json({ error: 'Username required' })
  const user = new User({ username })
  await user.save()
  res.json({ username: user.username, _id: user._id })
})

// --- Listar usuarios ---
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'username _id')
  res.json(users)
})

// --- Agregar ejercicio ---
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body
  const user = await User.findById(req.params._id)
  if(!user) return res.json({ error: 'User not found' })

  const exercise = new Exercise({
    username: user.username,
    userId: user._id,
    description,
    duration: Number(duration),
    date: date ? new Date(date) : new Date()
  })
  await exercise.save()
  res.json({
    username: exercise.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString(),
    _id: user._id
  })
})

// --- Obtener log de ejercicios ---
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query
  const user = await User.findById(req.params._id)
  if(!user) return res.json({ error: 'User not found' })

  let query = { userId: user._id }
  if(from || to) query.date = {}
  if(from) query.date.$gte = new Date(from)
  if(to) query.date.$lte = new Date(to)

  let exercises = await Exercise.find(query, 'description duration date').limit(Number(limit) || 0)
  exercises = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log: exercises
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
