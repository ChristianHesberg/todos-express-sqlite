var repo = require('../repo/todoRepo');

export function fetchTodos(req, res, next) {
    repo.fetchTodos((err, rows) => {
        if (err) { return next(err); }
        mapRows(res, rows);
        next();
    })
}

export function fetchTodosByTitle(req, res, next) {
    repo.fetchTodosByTitle(req.query.q, (err, rows) => {
        if (err) { return next(err); }
        mapRows(res, rows);
        next();
    })
}

export function insertToDo(req, res, next, synchronized){
    const todo = {
        title: req.body.title,
        completed: req.body.completed == true ? 1 : null,
        synchronized: synchronized
    };

    repo.insertToDo(todo, (err, lastID) => {
        if (err) { return next(err); }
        req.body.id = lastID;
        next();
    })
}

export function updateSynchronizedStatus(req, synchronized){
    repo.updateSynchronizedStatus(req.body.id, synchronized, (err) => {
        if (err) { return next(err); }
        next();
    })
}

export function mapRows(res, rows){
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

export async function postToApi(req, retries, delay){
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