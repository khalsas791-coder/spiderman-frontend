const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Admin', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: DataTypes.STRING,
    role: {
      type: DataTypes.STRING,
      defaultValue: 'admin'
    }
  });
};
