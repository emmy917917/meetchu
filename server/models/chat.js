module.exports = {
  query: [
    `CREATE TABLE IF NOT EXISTS meeting (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      description VARCHAR(255)
    )`
  ]
};
