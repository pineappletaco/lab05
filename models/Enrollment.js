const { sequelize, DataTypes } = require('../orm');

const Enrollment = sequelize.define('Enrollment', {
    Student_ID: {
        type: DataTypes.STRING(9),
        primaryKey: true
    },
    Course_ID: {
        type: DataTypes.STRING(8),
        primaryKey: true
    },
    Semester_ID: {  // 修正欄位名稱為 Semester_ID
        type: DataTypes.STRING(6),
        primaryKey: true
    },
    Enrollment_Date: {  // 新增缺少的欄位
        type: DataTypes.DATEONLY,  // 使用 DATEONLY 因為資料庫中是 date 類型
        allowNull: false
    },
    Grade: {
        type: DataTypes.DECIMAL(4, 1),  // 修正為 DECIMAL 與資料庫一致
        allowNull: true
    },
    Status: {
        type: DataTypes.STRING(10),  // 修正長度為 10
        allowNull: true,
        defaultValue: '修課中'  // 修正預設值與資料庫一致
    }
}, {
    tableName: 'ENROLLMENT',
    timestamps: false
});

module.exports = Enrollment;