// ormRelationTest.js
const { Student, Course, Department } = require('./models');

async function testRelations() {
    try {
        // 查詢學生及其所屬系所
        const student = await Student.findByPk('S10721001', {
            include: [Department]
        });

        if (student) {
            if (student.Department) {
                console.log(`學生 ${student.Name} 屬於 ${student.Department.Name} 系`);
            } else {
                console.log(`學生 ${student.Name} 沒有關聯的系所資料`);
            }
        } else {
            console.log('找不到指定的學生');
            return; // 如果找不到學生，停止後續操作
        }

        // 查詢學生及其選修的所有課程
        const studentWithCourses = await Student.findByPk('S10721001', {
            include: [Course]
        });

        if (studentWithCourses && studentWithCourses.Courses) {
            console.log(`${studentWithCourses.Name} 選修的課程：`);
            if (studentWithCourses.Courses.length > 0) {
                studentWithCourses.Courses.forEach(course => {
                    console.log(`- ${course.Title} (${course.Credits} 學分)`);
                });
            } else {
                console.log('- 沒有選修課程');
            }
        }

        // 查詢課程及其選修的學生
        const courseWithStudents = await Course.findByPk('CH201001', {
            include: [Student]
        });

        if (courseWithStudents && courseWithStudents.Students) {
            console.log(`選修 ${courseWithStudents.Title} 的學生：`);
            if (courseWithStudents.Students.length > 0) {
                courseWithStudents.Students.forEach(student => {
                    console.log(`- ${student.Name} (${student.Student_ID})`);
                });
            } else {
                console.log('- 沒有學生選修此課程');
            }
        } else {
            console.log('找不到指定的課程');
        }

    } catch (err) {
        console.error('關聯查詢出錯：', err);
    }
}

testRelations();