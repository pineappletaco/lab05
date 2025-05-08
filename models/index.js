const { sequelize } = require('../orm');
const Student = require('./Student');
const Department = require('./Department');
const Course = require('./Course');
const Enrollment = require('./Enrollment');

// 設定一對多關係：部門與學生
Department.hasMany(Student, { foreignKey: 'Department_ID' });
Student.belongsTo(Department, { foreignKey: 'Department_ID' });

// 設定一對多關係：部門與課程
Department.hasMany(Course, { foreignKey: 'Department_ID' });
Course.belongsTo(Department, { foreignKey: 'Department_ID' });

// 設定多對多關係：學生與課程，透過 Enrollment
Student.belongsToMany(Course, {
    through: Enrollment,
    foreignKey: 'Student_ID',
    otherKey: 'Course_ID'
});

Course.belongsToMany(Student, {
    through: Enrollment,
    foreignKey: 'Course_ID',
    otherKey: 'Student_ID'
});

module.exports = {
    sequelize,
    Student,
    Department,
    Course,
    Enrollment
};
