var express = require('express');
var router = express.Router();
var db = require('../db');
var axios = require('axios');

const postmanApiRoute = 'https://postman-echo.com/post';
const retryLimit = 3;
const retryDelayInMs = 2000;

function mapRows(res, rows){
  var todos = rows.map(function(row) {
    return {
      id: row.id,
      title: row.title,
      completed: row.completed == 1 ? true : false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      url: '/' + row.id,
      synchronized: row.synchronized
    }
  });
  res.locals.todos = todos;
  res.locals.activeCount = todos.filter(function(todo) { return !todo.completed; }).length;
  res.locals.completedCount = todos.length - res.locals.activeCount;
}

function fetchTodos(req, res, next) {
  db.all('SELECT * FROM todos', [], function(err, rows) {
    if (err) { return next(err); }
    mapRows(res, rows);
    next();
  });
}

function fetchTodosByTitle(req, res, next) {
  const sql = 'SELECT * FROM todos WHERE title LIKE ?';  
  const params = [`%${req.query.q}%`];

  db.all(sql, params, function(err, rows){
    if (err) { return next(err); }
    mapRows(res, rows);
    next();
  })
}

function insertToDo(req, res, next, synchronized){
  db.run('INSERT INTO todos (title, completed, created_at, synchronized) VALUES (?, ?, ?, ?)', [
    req.body.title,
    req.body.completed == true ? 1 : null,
    new Date().toISOString(),
    synchronized
  ], function(err) {
    if (err) { return next(err); }
    req.body.id = this.lastID;
    next();
  });
}

function updateSynchronizedStatus(req, synchronized){
  db.run('UPDATE todos SET synchronized = ? WHERE id = ?', [
    synchronized,
    req.body.id
  ], function(err) {
    if (err) { console.error('Error updating synchronization status', err) }
  });
}

async function postToApi(req, retries, delay){
  axios.post(postmanApiRoute, {
    id: req.body.id,
    title: req.body.title,
    completed: req.body.completed == 1 ? true : false,
    created_at: new Date().toISOString(),
    url: '/' + req.body.id
  }).then(() => {
    updateSynchronizedStatus(req, 1);
  }).catch(async error => {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      postToApi(req, retries - 1, delay * 2);
    } else {
      console.error('Retries failed with error: ', error);
    }
  })
}

/* GET home page. */
router.get('/', fetchTodos, function(req, res, next) {
  res.locals.filter = null;
  res.render('index');
});

router.get('/active', fetchTodos, function(req, res, next) {
  res.locals.todos = res.locals.todos.filter(function(todo) { return !todo.completed; });
  res.locals.filter = 'active';
  res.render('index');
});

router.get('/completed', fetchTodos, function(req, res, next) {
  res.locals.todos = res.locals.todos.filter(function(todo) { return todo.completed; });
  res.locals.filter = 'completed';
  res.render('index');
});

router.get('/search', fetchTodosByTitle, function(req, res, next) {
  res.locals.filter = null;
  res.render('index');
});

router.post('/', function(req, res, next) {
  req.body.title = req.body.title.trim();
  next();
}, function(req, res, next) {
  if (req.body.title !== '') { return next(); }
  return res.redirect('/' + (req.body.filter || ''));
}, function(req, res, next) {
  insertToDo(req, res, next, 0)
}, function (req, res, next){
  postToApi(req, retryLimit, retryDelayInMs);
  return res.redirect('/' + (req.body.filter || ''));
});

router.post('/:id(\\d+)', function(req, res, next) {
  req.body.title = req.body.title.trim();
  next();
}, function(req, res, next) {
  if (req.body.title !== '') { return next(); }
  db.run('DELETE FROM todos WHERE id = ?', [
    req.params.id
  ], function(err) {
    if (err) { return next(err); }
    return res.redirect('/' + (req.body.filter || ''));
  });
}, function(req, res, next) {
  db.run('UPDATE todos SET title = ?, completed = ?, updated_at = ? WHERE id = ?', [
    req.body.title,
    req.body.completed !== undefined ? 1 : null,
    new Date().toISOString(),
    req.params.id
  ], function(err) {
    if (err) { return next(err); }
    return res.redirect('/' + (req.body.filter || ''));
  });
});

router.post('/:id(\\d+)/delete', function(req, res, next) {
  db.run('DELETE FROM todos WHERE id = ?', [
    req.params.id
  ], function(err) {
    if (err) { return next(err); }
    return res.redirect('/' + (req.body.filter || ''));
  });
});

router.post('/toggle-all', function(req, res, next) {
  db.run('UPDATE todos SET completed = ?, updated_at = ?', [
    req.body.completed !== undefined ? 1 : null,
    new Date().toISOString()
  ], function(err) {
    if (err) { return next(err); }
    return res.redirect('/' + (req.body.filter || ''));
  });
});

router.post('/clear-completed', function(req, res, next) {
  db.run('DELETE FROM todos WHERE completed = ?', [
    1
  ], function(err) {
    if (err) { return next(err); }
    return res.redirect('/' + (req.body.filter || ''));
  });
});

module.exports = router;
