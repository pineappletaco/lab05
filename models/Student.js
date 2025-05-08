const { sequelize, DataTypes } = require('../orm');

const Student = sequelize.define('Student', {
    Student_ID: {
        type: DataTypes.STRING(9),
        primaryKey: true,
        allowNull: false
    },
    Name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    Birth_Date: {
        type: DataTypes.DATEONLY, // 使用 DATEONLY 僅存日期，不含時間
        allowNull: true
    },
    Gender: {
        type: DataTypes.CHAR(1),
        allowNull: true
    },
    Email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true // 加入唯一約束
    },
    Phone: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    Address: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    Admission_Year: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    Status: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    Department_ID: {
        type: DataTypes.STRING(5),
        allowNull: true
    },
    Emergency_Contact: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'STUDENT',
    timestamps: false // 不使用預設的 createdAt 和 updatedAt 欄位
});

module.exports = Student;