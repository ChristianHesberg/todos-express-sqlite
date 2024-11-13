var db = require('../db');
 
 export function fetchTodos(callback) {
    db.all('SELECT * FROM todos', [], callback);
  }
  
 export function fetchTodosByTitle(title, callback) {
    const sql = 'SELECT * FROM todos WHERE title LIKE ?';  
    const params = [`%${title}%`];
  
    db.all(sql, params, callback)
  }
  
  export function insertToDo(todo, callback){
    db.run('INSERT INTO todos (title, completed, created_at, synchronized) VALUES (?, ?, ?, ?)', [
      todo.title,
      todo.completed == true ? 1 : null,
      new Date().toISOString(),
      todo.synchronized
    ], function(err) {
        callback(err, this.lastId)}
    );
  }
  
  export function updateSynchronizedStatus(id, synchronized, callback){
    db.run('UPDATE todos SET synchronized = ? WHERE id = ?', [
      synchronized,
      id
    ], callback);
  }