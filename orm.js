// orm.js
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('university_db', 'root', '12345', {
    host: 'localhost',
    dialect: 'mariadb'
});

module.exports = { sequelize, DataTypes };
