var db = require('../db');
 
 function fetchTodos(callback) {
    db.all('SELECT * FROM todos', [], callback);
  }
  
 function fetchTodosByTitle(title, callback) {
    const sql = 'SELECT * FROM todos WHERE title LIKE ?';  
    const params = [`%${title}%`];
  
    db.all(sql, params, callback)
  }
  
 function insertToDo(todo, callback){
    db.run('INSERT INTO todos (title, completed, created_at, synchronized) VALUES (?, ?, ?, ?)', [
      todo.title,
      todo.completed == true ? 1 : null,
      new Date().toISOString(),
      todo.synchronized
    ], function(err) { callback(err, this.lastID) }
    );
  }
  
 function updateSynchronizedStatus(id, synchronized, callback){
    db.run('UPDATE todos SET synchronized = ? WHERE id = ?', [
      synchronized,
      id
    ], callback);
}

module.exports = {  
    fetchTodos,  
    fetchTodosByTitle,  
    insertToDo,
    updateSynchronizedStatus
};