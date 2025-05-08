const { sequelize, DataTypes } = require('../orm');

const Course = sequelize.define('Course', {
    Course_ID: {
        type: DataTypes.STRING(8),
        primaryKey: true
    },
    Title: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    Description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    Credits: {
        type: DataTypes.INTEGER,
        allowNull: true  // 根據數據庫結構，這裡應該是 allowNull: true
    },
    Level: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    Hours_Per_Week: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    Department_ID: {
        type: DataTypes.STRING(5),
        allowNull: true
    }
}, {
    tableName: 'COURSE',
    timestamps: false
});

module.exports = Course;