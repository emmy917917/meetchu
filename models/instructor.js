module.exports = (sequelize, Sequelize) => {
  const Instructor = sequelize.define('Instructor', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    email: {
      type: Sequelize.STRING,
      validate: {
        isEmail: true
      },
      allowNull: false,
      unique: true
    }
  }, {
    classMethods: {
      associate: (models) => {
        Instructor.belongsToMany(models.Course, { through: 'CourseInstructor' });
      }
    }
  });
  return Instructor;
};
