// --- index.js ---
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
})

// --- Conexión a MongoDB ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB conectado ✅'))
.catch(err => console.error('Error al conectar MongoDB:', err))

// --- Modelos ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: String,
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

// --- Crear usuario ---
app.post('/api/users', async (req, res) => {
  const { username } = req.body
  if(!username) return res.json({ error: 'Username required' })

  try {
    const user = new User({ username })
    await user.save()
    res.json({ username: user.username, _id: user._id.toString() })
  } catch (err) {
    res.status(500).json({ error: 'Error creando usuario' })
  }
})

// --- Listar usuarios ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id')
    res.json(users.map(u => ({ username: u.username, _id: u._id.toString() })))
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo usuarios' })
  }
})

// --- Agregar ejercicio ---
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body
  if(!description || !duration) return res.json({ error: 'Description and duration required' })

  try {
    const user = await User.findById(req.params._id)
    if(!user) return res.json({ error: 'User not found' })

    const exercise = new Exercise({
      userId: user._id,
      username: user.username,
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
      _id: user._id.toString()
    })
  } catch (err) {
    res.status(500).json({ error: 'Error agregando ejercicio' })
  }
})

// --- Obtener log de ejercicios ---
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query

  try {
    const user = await User.findById(req.params._id)
    if(!user) return res.json({ error: 'User not found' })

    let query = { userId: user._id }
    if(from || to) query.date = {}
    if(from) query.date.$gte = new Date(from)
    if(to) query.date.$lte = new Date(to)

    let exercises = await Exercise.find(query, 'description duration date')
      .sort({ date: 1 })
      .limit(limit ? Number(limit) : 0)

    exercises = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id.toString(),
      log: exercises
    })
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo logs' })
  }
})

// --- Listener ---
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Tu app está corriendo en el puerto ' + listener.address().port)
})
